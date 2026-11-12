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

from .fields import Hit, YEAR_RE, find_lines, is_below, is_right_of, is_sentence, money_values, norm, same_row, values_near, x_overlap
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
    # "2025 PROPERTY VALUE NOTICE" (Tarrant), "2025 Real Property Appraisal Notice"
    re.compile(r"\b(20[1-4]\d)\s+(?:real\s+)?(?:property\s+)?(?:tax\s+)?(?:value|appraisal|valuation)\s+notice\b"),
    # "official notice of the 2024 property tax appraisal" (Fort Bend, Harris letters)
    re.compile(r"\bnotice of the\s+(20[1-4]\d)\s+(?:property tax\s+)?apprais"),
    re.compile(r"\bproposed\s+(20[1-4]\d)\s+apprais"),
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

_COUNTIES = ["tarrant", "dallas", "johnson", "denton", "parker", "ellis", "collin", "harris", "travis", "williamson",
             "rockwall", "kaufman", "wise", "hood", "bexar", "fort bend", "montgomery", "hays", "brazoria", "galveston"]
_DOMAINS = {"tarrant": r"tad\.org", "dallas": r"dallascad|\bdcad\b", "johnson": r"johnsoncad", "denton": r"dentoncad",
            "parker": r"parkercad", "ellis": r"elliscad", "collin": r"collincad", "harris": r"\bhcad\b",
            "travis": r"traviscad", "williamson": r"\bwcad\b"}
# "<County> [Central|County] Apprais..." (also cut-off OCR like "Tarrant Apprais").
DISTRICTS = [
    (re.compile(rf"\b{c}\s*(?:central\s*|county\s*)?(?:apprais|cad\b)" + (f"|{_DOMAINS[c]}" if c in _DOMAINS else "")), c.title() + " County")
    for c in _COUNTIES
]
GENERIC_DISTRICT_RE = re.compile(r"\b([a-z]+(?: [a-z]+)?) (?:central |county )?appraisal district\b")

TAX_DOC_RE = re.compile(r"apprais|notice of (?:appraised )?value|appraisal district|\bcad\b|taxing unit")

MIN_VALUE, MAX_VALUE = 5_000, 200_000_000

# A value printed on a line naming a component of the total ("200,000 LAND",
# "350,000 IMPR", "Ag Land 12,000") is a breakdown row, not the market or
# appraised total under the same column header.
# (?<![a-z]) not \b: OCR often glues the word to the number ("350,000IMPR").
COMPONENT_RE = re.compile(r"(?<![a-z])(land|impr|imprv|improvements?|buildings?|structures?|ag|timber|taxable|exempt\w*|homestead cap)\b")


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
    # Fallback 1: the latest year named in a value label ("2025 Market Value",
    # "2024 Appraised Value"): a notice labels this year's and last year's
    # values, never next year's. Running text is skipped: legal notes name
    # future tax years ("for the 2024, 2025, and 2026 tax years").
    label_years = [
        int(y) for l in doc.lines if l.page == 1 and not is_sentence(l, 8) and KIND_RE.search(norm(l.text))
        for y in YEAR_RE.findall(norm(l.text)) if 2015 <= int(y) <= 2040
    ]
    if label_years:
        return max(label_years)
    # Fallback 2: the latest year printed in a short header.
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
        for h in sorted(heads, key=lambda l: (v.y0 - l.y1, -x_overlap(l, v))):
            p = _period_of(h.text, year)
            if p:
                return p
    if hit.how == "below":
        # Row label to the left of the value.
        rows = [
            l for l in doc.lines
            if l is not v and same_row(l, v) and l.x1 <= v.x0 + 2 and _is_period_header(l)
        ]
        for r in sorted(rows, key=lambda l: abs(l.cy - v.cy)):
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
            (h for h in values_near(doc, line, m.end(), lambda s: [v for v in money_values(s) if MIN_VALUE <= v <= MAX_VALUE],
                                    max_below_lines=7)
             if h.line is line or not COMPONENT_RE.search(norm(h.line.text))),
            key=lambda h: h.distance,
        )
        if own:
            # "2026 Market Value $X" / a fused column header: nearest value only.
            if hits:
                out.append(Cand(kind, own, int(hits[0].value), hits[0].distance))
            continue
        mine: dict[str, set[int]] = {}
        found: list[Cand] = []
        for h in hits:
            period = _period_for_value(doc, line, h, year)
            if period:
                mine.setdefault(period, set()).add(int(h.value))
                found.append(Cand(kind, period, int(h.value), h.distance))
        # Two different values claiming the same year under one label means
        # the grid was misread (skewed photo): drop that year, do not guess.
        out.extend(c for c in found if len(mine[c.period]) == 1)
    return out


def _resolve_market_vs_appraised(best: dict, support: Counter, period: str) -> None:
    """Appraised value can never exceed market value for the same year (the
    homestead cap only lowers it). If it does, one of the two cells was
    misread (OCR turned 460,000 into 400000): keep the value printed more
    often on the notice, and drop both when that does not settle it."""
    m, a = best.get(("market", period)), best.get(("appraised", period))
    if not (m and a) or a.value <= m.value:
        return
    sm, sa = support[m.value], support[a.value]
    if sa > sm:
        del best[("market", period)]
    elif sm > sa:
        del best[("appraised", period)]
    else:
        del best[("market", period)], best[("appraised", period)]


def pick_values(cands: list[Cand], support: Optional[Counter] = None) -> tuple[Optional[int], Optional[int]]:
    best: dict[tuple[str, str], Cand] = {}
    values: dict[tuple[str, str], set[int]] = {}
    for c in cands:
        k = (c.kind, c.period)
        values.setdefault(k, set()).add(c.value)
        if k not in best or c.score < best[k].score:
            best[k] = c
    for k, vs in values.items():
        if len(vs) > 1:
            del best[k]  # contradictory readings of the same cell: unknown
    for period in ("cur", "prior"):
        _resolve_market_vs_appraised(best, support or Counter(), period)
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
            if same_row(line, l) and is_right_of(line, l) and l.x0 - line.x1 < 300:
                cands.append((1 + max(0.0, l.x0 - line.x1), l, l.text))
            elif is_below(line, l) and l.y0 - line.y1 < 2.6 * line.h + 6 and x_overlap(line, l, pad=20) > 0:
                cands.append((1000 + max(0.0, l.y0 - line.y1), l, l.text))
        for _, l, text in sorted(cands, key=lambda c: c[0]):
            sm = STREET_RE.match(text.strip())
            if not sm or NOT_SITUS_RE.search(norm(text)):
                continue
            street = re.sub(r"\s+", " ", sm.group(1)).strip(" ,")
            street = re.split(r"\s+(?:lot|blk|block|abst|abstract|acres?|tract|unit \d+ bldg|legal)\b", street, maxsplit=1, flags=re.I)[0]
            if re.search(r"\b(po box|p\.o\.)", street, re.I):
                continue
            # Append the city line directly under it, if there is one.
            below = [
                b for b in doc.lines
                if b is not l and is_below(l, b) and b.y0 - l.y1 < 1.6 * l.h + 4 and x_overlap(l, b, pad=10) > 0
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
    stop = {"the", "your", "an", "a", "appraisal", "central", "this", "contact", "county", "local", "my", "our", "each", "that"}
    for m in GENERIC_DISTRICT_RE.finditer(text):
        words = m.group(1).split()
        if any(w in stop for w in words):
            continue
        return m.group(1).title() + " County"
    return None


def extract_tax(doc: Document) -> dict:
    text = norm(doc.text)
    year = notice_year(doc)
    support = Counter(v for l in doc.lines for v in money_values(norm(l.text)))
    cur, prior = pick_values(value_candidates(doc, year), support)
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
