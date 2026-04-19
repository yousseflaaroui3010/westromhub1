import { load } from 'cheerio';
import type { CadLookupResult } from './types';
import { splitStreet } from './normalizeAddress';

const DCAD_BASE = 'https://www.dallascad.org';
const SEARCH_URL = `${DCAD_BASE}/SearchAddr.aspx`;
const TIMEOUT_MS = 12_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; WestromHub/1.0; +https://westromhub.com)';

/**
 * Dallas Central Appraisal District (dallascad.org) adapter.
 *
 * DCAD runs Tyler Technologies Appraisal (iasWorld), an ASP.NET WebForms
 * platform distinct from TAD's PACS. Search flow:
 *   1. GET search page → extract ViewState tokens + form action URL
 *   2. POST address search form
 *   3. Parse results → follow AcctDetailRes.aspx link
 *   4. GET detail page → parse value history table
 */

function parseMoneyString(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) || value <= 0 ? null : Math.round(value);
}

async function fetchHtml(url: string, init?: RequestInit): Promise<string | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        ...(init?.headers as Record<string, string> ?? {}),
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractViewStateTokens(html: string): Record<string, string> {
  const $ = load(html);
  const tokens: Record<string, string> = {};
  ['__VIEWSTATE', '__EVENTVALIDATION', '__VIEWSTATEGENERATOR'].forEach(name => {
    const val = $(`input[name="${name}"]`).val();
    if (typeof val === 'string' && val.length > 0) tokens[name] = val;
  });
  return tokens;
}

function extractFormAction(html: string): string {
  const $ = load(html);
  const action = $('form').attr('action');
  if (!action) return SEARCH_URL;
  if (action.startsWith('http')) return action;
  return `${DCAD_BASE}${action.startsWith('/') ? '' : '/'}${action}`;
}

function parseResults(html: string): string | null {
  const $ = load(html);
  const link = $('a[href*="AcctDetailRes"]').first().attr('href');
  if (!link) return null;
  if (link.startsWith('http')) return link;
  return `${DCAD_BASE}${link.startsWith('/') ? '' : '/'}${link}`;
}

function parseDetail(html: string): CadLookupResult | null {
  const $ = load(html);
  const currentYear = new Date().getFullYear();
  const priorYear = currentYear - 1;

  let currentValue: number | null = null;
  let priorValue: number | null = null;

  const textBodyCleaned = $('body').text().replace(/\s+/g, ' ');
  const proposedMatch = textBodyCleaned.match(new RegExp(`${currentYear}\\s*Proposed Values.*?Market Value:\\s*\\$[\\d,]+\\s*\\+\\s*\\$[\\d,]+\\s*=\\s*\\$([\\d,]+)`));
  
  if (proposedMatch) {
     currentValue = parseMoneyString(proposedMatch[1]);
  } else {
    const fallbackMatch = textBodyCleaned.match(new RegExp(`${currentYear}\\s*Proposed Values.*?Market Value:\\s*\\$([\\d,]+)`));
    if (fallbackMatch) {
       currentValue = parseMoneyString(fallbackMatch[1]);
    }
  }

  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    if (rows.length === 0) return;
    
    const headers = rows.first().find('th, td').map((_idx, cell) => $(cell).text().trim().toLowerCase()).get();
    if (!headers.includes('year')) return;
    
    let valueColIdx = headers.findIndex(h => h.includes('appraised'));
    if (valueColIdx === -1) valueColIdx = headers.findIndex(h => h.includes('total') || h.includes('market') || h.includes('value'));
    const yearColIdx = headers.indexOf('year');
    
    if (valueColIdx === -1 || yearColIdx === -1) return;
    
    rows.slice(1).each((_idx, row) => {
      const cells = $(row).find('td');
      if (cells.length <= Math.max(yearColIdx, valueColIdx)) return;
      
      const year = parseInt($(cells[yearColIdx]).text().trim(), 10);
      const value = parseMoneyString($(cells[valueColIdx]).text().trim());
      
      if (isNaN(year) || value === null) return;
      
      if (year === currentYear && currentValue === null) currentValue = value;
      if (year === priorYear && priorValue === null) priorValue = value;
    });
  });

  if (currentValue === null && priorValue === null) {
     return null;
  }

  return {
    currentYear,
    currentValue: currentValue ?? 0,
    priorYear,
    priorValue: priorValue ?? 0,
  };
}

export async function lookupDcad(address: string): Promise<CadLookupResult | null> {
  try {
    const initHtml = await fetchHtml(SEARCH_URL);
    if (!initHtml) return null;

    const tokens = extractViewStateTokens(initHtml);
    const postUrl = extractFormAction(initHtml);
    const { streetNumber, streetName } = splitStreet(address);
    if (!streetNumber) return null;

    const formBody = new URLSearchParams({
      txtAddrNum: streetNumber,
      txtStName: streetName,
      ...tokens,
    });

    const searchHtml = await fetchHtml(postUrl, {
      method: 'POST',
      body: formBody.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: SEARCH_URL,
      },
    });
    
    if (!searchHtml) return null;

    const detailUrl = parseResults(searchHtml);
    if (!detailUrl) return null;

    const detailHtml = await fetchHtml(detailUrl);
    if (!detailHtml) return null;

    const $ = load(detailHtml);
    const historyLink = $('a').toArray().map(a => $(a).attr('href')).find(href => href && href.includes('AcctHistory'));
    
    let htmlToParse = detailHtml;
    if (historyLink) {
      const historyUrl = `${DCAD_BASE}${historyLink.startsWith('/') ? '' : '/'}${historyLink}`;
      const historyHtml = await fetchHtml(historyUrl);
      if (historyHtml) htmlToParse = historyHtml;
    }

    return parseDetail(htmlToParse);
  } catch (err) {
    console.error('[dcad] unexpected error:', err instanceof Error ? err.message : err);
    return null;
  }
}
