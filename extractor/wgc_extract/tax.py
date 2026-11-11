"""Texas notice of appraised value -> {address, county, currentValue, priorValue}.

Notices put the values in a small grid. The two axes are
  KIND   : market value | appraised value
  PERIOD : current year (the notice's tax year, "proposed", "current")
           | prior year ("last year", "prior", "certified", year - 1)
and either axis can be the rows. Some forms fuse both into one label
("2026 Market Value", "Last Year Appraised Value"). We find every KIND
label, resolve the PERIOD of each value next to it (from the label itself,
from a column header above the value, or from a row label left of it), and
then pick like-for-like: market/market if both years have it, otherwise
appraised/appraised.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import Optional

from .fields import Hit, YEAR_RE, find_lines, is_sentence, money_values, norm, same_row, values_near, x_overlap
from .reader import Document, Line

KIND_RE = re.compile(r"\b(market|apprais(?:ed|al))\s*(?:value|val\b)", re.I)
# Component or derived values that are NOT the total we want.
EXCLUDE_KIND_RE = re.compile(
    r"\b(land|improvement|imprv|impr\b|ag\b|agricultur|timber|taxable|exempt|homestead cap|hs cap|"
    r"limitation|circuit|new construction|personal property|ceiling|productivity)"
)
PRIOR_RE = re.compile(r"\b(last year|prior year|previous year|prior|certified|\blast\b)")
CURRENT_RE = re.compile(r"\b(current year|current|proposed|this year|new value|preliminary)")
NOTICE_YEAR_RES = [
    re.compile(r"\b(20[1-4]\d)\s+(?:notice of (?:appraised|appraisal)|appraisal notice|notice of value|proposed)"),
    re.compile(r"\b(?:tax|appraisal)\s*year[:\s]+(20[1-4]\d)\b"),
    re.compile(r"\bnotice of appraised value\D{0,20}(20[1-4]\d)\b"),
]

ADDRESS_LABEL_RE = re.compile(
    r"\b(situs(?: address)?|property (?:address|location)|location(?: address)?|physical address|"
    r"property site address|site address)\b\s*:?\s*"
)
ADDRESS_LABEL_RE_CI = re.compile(ADDRESS_LABEL_RE.pattern, re.I)
NOT_SITUS_RE = re.compile(r"\b(mailing|owner'?s? address|owner name|mail to|remit)")
STREET_RE = re.compile(r"^\s*(\d{1,6}[a-z]?(?:-\d+)?\s+(?:[nsew]\.?\s+)?[a-z0-9][\w .'#/-]{2,60})", re.I)
CITY_LINE_RE = re.compile(r"^[a-z .'-]{2,30},?\s+(tx|texas)\b\.?(\s+\d{5}(-\d{4})?)?$", re.I)

DISTRICTS = [
    (re.compile(r"\btarrant (?:appraisal district|cad)\b|\btad\.org\b|\btarrant county\b"), "Tarrant County"),
    (re.compile(r"\bdallas (?:central )?appraisal district\b|\bdallascad\b|\bdcad\b|\bdallas county\b"), "Dallas County"),
    (re.compile(r"\bjohnson (?:central )?appraisal district\b|\bjohnsoncad\b|\bjohnson county\b"), "Johnson County"),
    (re.compile(r"\bdenton (?:central )?appraisal district\b|\bdentoncad\b|\bdenton county\b"), "Denton County"),
    (re.compile(r"\bparker (?:county )?appraisal district\b|\bparkercad\b|\bparker county\b"), "Parker County"),
    (re.compile(r"\bellis (?:central )?appraisal district\b|\belliscad\b|\bellis county\b"), "Ellis County"),
    (re.compile(r"\bcollin (?:central )?appraisal district\b|\bcollincad\b|\bcollin county\b"), "Collin County"),
    (re.compile(r"\bharris (?:central )?appraisal district\b|\bhcad\b|\bharris county\b"), "Harris County"),
    (re.compile(r"\btravis (?:central )?appraisal district\b|\btraviscad\b|\btravis county\b"), "Travis County"),
    (re.compile(r"\bwilliamson (?:central )?appraisal district\b|\bwcad\b|\bwilliamson county\b"), "Williamson County"),
    (re.compile(r"\brockwall (?:central )?appraisal district\b|\brockwall county\b"), "Rockwall County"),
    (re.compile(r"\bkaufman (?:central )?appraisal district\b|\bkaufman county\b"), "Kaufman County"),
    (re.compile(r"\bwise (?:county )?appraisal district\b|\bwise county\b"), "Wise County"),
    (re.compile(r"\bhood (?:central )?appraisal district\b|\bhood county\b"), "Hood County"),
]
GENERIC_DISTRICT_RE = re.compile(r"\b([a-z]+(?: [a-z]+)?) (?:central |county )?appraisal district\b")

TAX_DOC_RE = re.compile(r"apprais|notice of (?:appraised )?value|appraisal district|\bcad\b|taxing unit")

MIN_VALUE, MAX_VALUE = 5_000, 200_000_000


@dataclass
class Cand:
    kind: str  # market | appraised
    period: str  # cur | prior
    value: int
    score: float  # lower is better


def _kind(text: str) -> Optional[str]:
    t = norm(text)
    m = KIND_RE.search(t)
    if not m or EXCLUDE_KIND_RE.search(t):
        return None
    return "market" if m.group(1).startswith("market") else "appraised"


def notice_year(doc: Document) -> Optional[int]:
    head = [norm(l.text) for l in doc.lines if l.page == 1][:80]
    for rx in NOTICE_YEAR_RES:
        for t in head:
            m = rx.search(t)
            if m:
                return int(m.group(1))
    # Fallback: the latest year printed in a value label or a short header
    # (not in running text, where deadlines and law dates appear).
    years: Counter[int] = Counter()
    for l in doc.lines:
        t = norm(l.text)
        if is_sentence(l, 8) and not KIND_RE.search(t):
            continue
        for y in YEAR_RE.findall(t):
            if 2015 <= int(y) <= 2040:
                years[int(y)] += 1
    return max(years) if years else None


def _period_of(text: str, year: Optional[int]) -> Optional[str]:
    t = norm(text)
    ys = [int(y) for y in YEAR_RE.findall(t)]
    if ys and year:
        if year in ys:
            return "cur"
        if year - 1 in ys:
            return "prior"
    if PRIOR_RE.search(t):
        return "prior"
    if CURRENT_RE.search(t):
        return "cur"
    return None


def _is_period_header(l: Line) -> bool:
    t = norm(l.text)
    if len(t) > 40 and len(t.split()) > 4:
        return False
    return bool(YEAR_RE.search(t) or PRIOR_RE.search(t) or CURRENT_RE.search(t))


def _period_for_value(doc: Document, label: Line, hit: Hit, year: Optional[int]) -> Optional[str]:
    """Resolve the period of a value that sits beside or under a KIND label."""
    v = hit.line
    if hit.how in ("right", "same"):
        # Column header above the value (same page, x overlap, nearest).
        heads = [
            l for l in doc.lines
            if l.page == v.page and l.y1 <= v.y0 + 1 and v.y0 - l.y1 < 260 and l is not label
            and x_overlap(l, v, pad=8) > 0 and _is_period_header(l)
        ]
        for h in sorted(heads, key=lambda l: v.y0 - l.y1):
            p = _period_of(h.text, year)
            if p:
                return p
    if hit.how == "below":
        # Row label to the left of the value.
        rows = [
            l for l in doc.lines
            if l is not v and same_row(l, v) and l.x1 <= v.x0 + 2 and _is_period_header(l)
        ]
        for r in sorted(rows, key=lambda l: v.x0 - l.x1):
            p = _period_of(r.text, year)
            if p:
                return p
    return None


PERIOD_TOKEN_RE = re.compile(
    r"\b(20[1-4]\d)\b|\b(last year|prior year|previous year|current year|this year|prior|certified|current|proposed|preliminary)\b"
)


def _period_tokens(text: str, year: Optional[int]) -> list[str]:
    """Every period named in a header line, left to right ('2025  2026')."""
    out = []
    for m in PERIOD_TOKEN_RE.finditer(norm(text)):
        p = _period_of(m.group(0), year)
        if p:
            out.append(p)
    # "2025 Certified" names one period, not two.
    dedup: list[str] = []
    for p in out:
        if not dedup or dedup[-1] != p:
            dedup.append(p)
    return dedup


def _stacked_period(doc: Document, label: Line, year: Optional[int]) -> Optional[str]:
    """Two-line column header: 'Last Year' directly above 'Appraised Value'."""
    above = [
        l for l in doc.lines
        if l.page == label.page and l is not label and -0.5 * label.h <= label.y0 - l.y1 <= 1.2 * label.h + 2 and l.y0 < label.y0 - 1
        and x_overlap(l, label) > 0.5 * min(l.x1 - l.x0, label.x1 - label.x0)
        and len(l.text.split()) <= 4
    ]
    for l in sorted(above, key=lambda l: label.y0 - l.y1):
        p = _period_of(l.text, year)
        if p:
            return p
    return None


def _multi_values_same_line(doc: Document, label: Line, end: int, year: Optional[int]) -> list[Cand]:
    """'Market Value  $250,000  $300,000' merged into one text item: map the
    values left-to-right onto the period headers above, left-to-right."""
    kind = _kind(label.text)
    vals = [v for v in money_values(norm(label.text)[end:]) if MIN_VALUE <= v <= MAX_VALUE]
    if not kind or len(vals) < 2:
        return []
    heads = [
        l for l in doc.lines
        if l.page == label.page and l.y1 <= label.y0 + 1 and label.y0 - l.y1 < 200
        and l.x1 >= label.x0 and _is_period_header(l) and _period_tokens(l.text, year)
    ]
    if not heads:
        return []
    nearest = max(h.y1 for h in heads)
    row = sorted([h for h in heads if nearest - h.y1 < 6], key=lambda l: l.x0)
    periods = [p for h in row for p in _period_tokens(h.text, year)]
    if len(periods) < len(vals):
        return []
    periods = periods[-len(vals):]  # values line up with the right-most headers
    return [Cand(kind, p, v, 5 + i) for i, (p, v) in enumerate(zip(periods, vals))]


def value_candidates(doc: Document, year: Optional[int]) -> list[Cand]:
    out: list[Cand] = []
    for line, m in find_lines(doc, KIND_RE):
        if is_sentence(line, 10):
            continue
        kind = _kind(line.text)
        if not kind:
            continue
        own = _period_of(line.text, year) or _stacked_period(doc, line, year)
        merged = _multi_values_same_line(doc, line, m.end(), year)
        if merged:
            out.extend(merged)
            continue
        hits = sorted(
            values_near(doc, line, m.end(), lambda s: [v for v in money_values(s) if MIN_VALUE <= v <= MAX_VALUE],
                        max_below_lines=7),
            key=lambda h: h.distance,
        )
        if own:
            # "2026 Market Value $X" / a fused column header: nearest value only.
            if hits:
                out.append(Cand(kind, own, int(hits[0].value), hits[0].distance))
            continue
        for h in hits:
            period = _period_for_value(doc, line, h, year)
            if period:
                out.append(Cand(kind, period, int(h.value), h.distance))
    return out


def pick_values(cands: list[Cand]) -> tuple[Optional[int], Optional[int]]:
    best: dict[tuple[str, str], Cand] = {}
    for c in cands:
        k = (c.kind, c.period)
        if k not in best or c.score < best[k].score:
            best[k] = c
    get = lambda kind, period: best[(kind, period)].value if (kind, period) in best else None  # noqa: E731
    mc, mp, ac, ap = get("market", "cur"), get("market", "prior"), get("appraised", "cur"), get("appraised", "prior")
    if mc and mp:
        cur, prior = mc, mp
    elif ac and ap:
        cur, prior = ac, ap
    else:
        cur, prior = (mc or ac), (mp or ap)
    if cur and prior and not (0.2 <= cur / prior <= 5):
        prior = None  # implausible pairing; keep the value we are surest of
    return cur, prior


def find_address(doc: Document) -> Optional[str]:
    for line, m in find_lines(doc, ADDRESS_LABEL_RE):
        t = norm(line.text)
        if NOT_SITUS_RE.search(t[: m.start() + 1]) or is_sentence(line, 16):
            continue
        cands: list[tuple[float, Line, str]] = []
        # Same item: text after the label (keep original casing).
        tail = ADDRESS_LABEL_RE_CI.sub("", line.text, count=1).strip(" :-")
        if STREET_RE.match(tail):
            cands.append((0, line, tail))
        for l in doc.lines:
            if l is line or l.page != line.page:
                continue
            if same_row(line, l) and l.x0 >= line.x1 - 2 and l.x0 - line.x1 < 300:
                cands.append((1 + l.x0 - line.x1, l, l.text))
            elif l.y0 >= line.y1 - 2 and l.y0 - line.y1 < 2.6 * line.h + 6 and x_overlap(line, l, pad=20) > 0:
                cands.append((1000 + l.y0 - line.y1, l, l.text))
        for _, l, text in sorted(cands, key=lambda c: c[0]):
            sm = STREET_RE.match(text.strip())
            if not sm or NOT_SITUS_RE.search(norm(text)):
                continue
            street = re.sub(r"\s+", " ", sm.group(1)).strip(" ,")
            if re.search(r"\b(po box|p\.o\.)", street, re.I):
                continue
            # Append the city line directly under it, if there is one.
            below = [
                b for b in doc.lines
                if b.page == l.page and b is not l and 0 <= b.y0 - l.y1 < 1.6 * l.h + 4 and x_overlap(l, b, pad=10) > 0
            ]
            for b in sorted(below, key=lambda b: b.y0)[:1]:
                if CITY_LINE_RE.match(b.text.strip()):
                    street = f"{street}, {b.text.strip()}"
            return street[:200]
    return None


def find_county(doc: Document) -> Optional[str]:
    text = norm(doc.text)
    for rx, name in DISTRICTS:
        if rx.search(text):
            return name
    m = GENERIC_DISTRICT_RE.search(text)
    if m and m.group(1) not in ("the", "your", "an", "appraisal", "central", "this"):
        return m.group(1).title() + " County"
    return None


def extract_tax(doc: Document) -> dict:
    text = norm(doc.text)
    year = notice_year(doc)
    cur, prior = pick_values(value_candidates(doc, year))
    out: dict = {}
    address = find_address(doc)
    county = find_county(doc)
    if address:
        out["address"] = address
    if county:
        out["county"] = county
    if cur:
        out["currentValue"] = cur
    if prior:
        out["priorValue"] = prior
    if year:
        out["taxYear"] = year
    if not cur and not prior and not TAX_DOC_RE.search(text):
        out = {"error": "not_a_tax_document"}
    return out
