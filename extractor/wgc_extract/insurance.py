"""Insurance declarations page -> {policyType, windHailDeductible,
aopDeductible, hasLossOfRent, hasWaterBackup, annualPremium}.

Booleans are tri-state on purpose: True when the coverage is listed, False
only when the page says it is excluded / not covered / declined, and absent
when the page does not mention it (a missing endorsement page must not be
reported as a coverage gap).
"""

from __future__ import annotations

import re
from typing import Optional

from .fields import Hit, find_lines, first, is_right_of, is_sentence, money_values, norm, pct_values, values_near
from .reader import Document, Line

INS_DOC_RE = re.compile(r"declaration|policy (?:number|period|premium)|insured|coverage [a-f]\b|premium|deductible|dwelling")

# --- policy type -------------------------------------------------------------
# ISO "DP 00 03", Texas "TDP-3", "HO-3", "HO 00 03", Texas "HO-B"/"HO-A".
FORM_RE = re.compile(
    r"\b(?P<kind>t?dp|ho)[\s-]*(?:00[\s-]*)?0?(?P<num>[1-8])\b(?![\d,])|\b(?P<tx>ho)[\s-]?(?P<let>[abc])\b(?![-\w])"
)
DWELLING_RE = re.compile(r"\b(dwelling (?:fire|property|policy)|landlord|rental dwelling|non-?owner occupied)\b")
HOMEOWNERS_RE = re.compile(r"\bhomeowners?(?: policy| insurance| package)?\b")
CONDO_RENTERS_RE = re.compile(r"\b(condominium unit ?owners?|renters|tenant)\b")

# --- deductibles ---------------------------------------------------------------
WIND_RE = re.compile(r"\b(wind(?:storm)?\s*(?:/|&|and|or|-)?\s*hail|windstorm|named storm|hurricane|wind/hail)\b")
AOP_RE = re.compile(r"\b(all other (?:perils?|losses|causes)|\baop\b|all (?:covered )?(?:perils?|losses)|other perils|other than wind)")
# "deductibl e" / "deductibIe": OCR splits and misreads the word.
DEDUCT_RE = re.compile(r"\bdeduct(?:ib\w*)?\b")
WINDSTORM_ONLY_RE = re.compile(r"windstorm and hail only|wind(?:storm)? (?:and|&) hail (?:only|policy)|twia|texas windstorm")

# --- premium -----------------------------------------------------------------
PREMIUM_LABELS = [
    (re.compile(r"\btotal (?:annual |policy |estimated )?premium(?: and surcharges| \(?including[^)]*\)?| ?(?:,|&|and) fees)?\b"), 0),
    (re.compile(r"\bannual premium\b"), 1),
    (re.compile(r"\b(?:total )?policy (?:term )?premium\b"), 2),
    (re.compile(r"\bpremium total\b|\btotal (?:policy )?cost\b|\btotal due\b"), 3),
    (re.compile(r"\bpremium\b"), 5),
]
NOT_PREMIUM_RE = re.compile(r"\b(minimum earned|installment|down ?payment|per (?:month|installment)|monthly|balance|paid to date|deposit)\b")
# Form / edition numbers ("Item #1-A forms: 320 220") read like money after OCR.
FORM_NUMBERS_RE = re.compile(r"\bforms?\b(?! of payment)|\bedition\b|\bendorsement (?:no|number)")
# A rental home's annual premium; larger numbers are limits or form numbers.
MAX_PREMIUM = 100_000

# --- coverages -----------------------------------------------------------------
RENT_RE = re.compile(r"\b(fair rental value|loss of rents?|rental income|rents? loss|loss of use|rental value)\b")
WATER_RE = re.compile(r"\b(water back[\s-]?up|back[\s-]?up of (?:sewers?|drains?)|sewer (?:and|&|or|/) drain|sewer back[\s-]?up|sump (?:pump|discharge|overflow))\b")
EXCLUDED_RE = re.compile(r"\b(not covered|excluded|exclusion|declined|rejected|not included|not purchased|no coverage)\b|\bn/?a\b(?!\w)|(?:^|\s)none\b|\$\s?0(?:\.00)?\b|(?<![\w$,.])0(?![\w,.%])")
INCLUDED_RE = re.compile(r"\$\s?\d|\b\d{1,3}(?:,\d{3})+\b|\d\s?%|\bincluded\b|\bsee (?:form|endorsement)|\byes\b|\bcovered\b|\bactual loss sustained\b|\b\d{1,2} months?\b")


def policy_type(doc: Document) -> Optional[str]:
    text_lines = [norm(l.text) for l in doc.lines]
    found: list[tuple[int, str]] = []
    for i, t in enumerate(text_lines):
        for m in FORM_RE.finditer(t):
            if m.group("tx"):
                found.append((i, f"HO-{m.group('let').upper()} (Homeowners)"))
            else:
                kind = m.group("kind").upper().replace("TDP", "DP")
                found.append((i, f"{kind}-{m.group('num')}"))
    if found:
        # Prefer a form near a policy-type/form label, then the earliest.
        for i, label in found:
            if re.search(r"\b(policy type|form|program|coverage form|policy form)\b", text_lines[i]):
                return label
        return found[0][1]
    head = " ".join(text_lines[:40])
    if DWELLING_RE.search(head):
        m = DWELLING_RE.search(head)
        return "Landlord" if "landlord" in m.group(1) else "Dwelling"
    if CONDO_RENTERS_RE.search(head):
        return None
    if HOMEOWNERS_RE.search(head):
        return "Homeowners"
    return None


MAX_DEDUCT_PCT = 15.0


def _ded_value(text: str) -> Optional[str]:
    """'2% ($6,400)' -> '2%'; '$1,000' -> '$1,000'."""
    # Percentage deductibles run 0.25%-10% (wind/hail, hurricane, AOP). 80%,
    # 90%, 100% are coinsurance, often printed in the same row ("80% 1%").
    p = [v for v in pct_values(text) if 0.1 <= v <= MAX_DEDUCT_PCT]
    if p:
        v = p[0]
        return f"{v:g}%"
    m = money_values(text)
    if m:
        v = m[0]
        if 50 <= v <= 250_000:
            return f"${v:,}"
    return None


def _ded_parse(s: str) -> list[str]:
    v = _ded_value(s)
    return [v] if v else []


def _deductible_for(doc: Document, label_re: re.Pattern[str], exclude_re: Optional[re.Pattern[str]] = None) -> Optional[str]:
    best: Optional[Hit] = None
    for line, m in find_lines(doc, label_re):
        t = norm(line.text)
        if is_sentence(line, 16):
            continue
        if exclude_re is not None and exclude_re.search(t):
            continue
        # The label must be about a deductible: on this line, or this line sits
        # in a deductible row/section ("Deductibles: Wind/Hail 2%").
        about_deductible = bool(DEDUCT_RE.search(t)) or any(
            DEDUCT_RE.search(norm(o.text)) for o in doc.lines
            if o.page == line.page and 0 <= line.y0 - o.y1 < 6 * line.h and abs(o.x0 - line.x0) < 60 and not is_sentence(o, 8)
        )
        if not about_deductible:
            continue
        end = m.end()
        dm = DEDUCT_RE.search(t)
        if dm and dm.end() > end:
            end = dm.end()
        hits = values_near(doc, line, end, _ded_parse, max_right=420)
        h = first(hits)
        # "$1,000 all peril deductible": the amount comes first on the line.
        before = _ded_value(t[: m.start()]) if not h or h.how != "same" else None
        if before and not re.search(r"[a-z]{3,}", t[: m.start()]):
            h = Hit(line, before, 0.5, "same")
        if h and (best is None or h.distance < best.distance):
            best = h
    return best.value if best else None  # type: ignore[return-value]


def deductibles(doc: Document) -> tuple[Optional[str], Optional[str]]:
    wind = _deductible_for(doc, WIND_RE)
    aop = _deductible_for(doc, AOP_RE)
    text = norm(doc.text)
    if not aop or not wind:
        # Generic "Deductible" lines: the policy-wide (AOP) deductible, or the
        # wind deductible on a windstorm-only policy (TWIA).
        generic = _deductible_for(doc, re.compile(r"\b(?:section i |policy |all peril |standard )?deductible\b"), exclude_re=re.compile(r"wind|hail|hurricane|named storm|earthquake|flood|theft|water|sewer|mold|liability|medical"))
        if generic:
            if WINDSTORM_ONLY_RE.search(text):
                wind = wind or generic
            else:
                aop = aop or generic
    return wind, aop


def annual_premium(doc: Document) -> Optional[int]:
    best: Optional[tuple[int, float, int]] = None  # (priority, distance, value)
    for rx, prio in PREMIUM_LABELS:
        for line, m in find_lines(doc, rx):
            t = norm(line.text)
            if is_sentence(line, 12) or NOT_PREMIUM_RE.search(t):
                continue
            hits = values_near(
                doc, line, m.end(),
                lambda s: [v for v in money_values(s) if 50 <= v <= MAX_PREMIUM],
                directions=("same", "right", "below", "above"), max_right=480,
            )
            for h in sorted(hits, key=lambda h: h.distance):
                if h.line is not line and (NOT_PREMIUM_RE.search(norm(h.line.text)) or FORM_NUMBERS_RE.search(norm(h.line.text))):
                    continue
                key = (prio, h.distance, int(h.value))
                if best is None or key[:2] < best[:2]:
                    best = key
                break
    return best[2] if best else None


ALE_ONLY_RE = re.compile(r"living expenses?\b|\bale\b")


def _coverage_flag(doc: Document, term_re: re.Pattern[str]) -> Optional[bool]:
    verdict: Optional[bool] = None
    for line, m in find_lines(doc, term_re):
        if is_sentence(line, 18):
            continue
        t = norm(line.text)
        # Homeowners "Loss of Use - Additional living expense" pays the owner's
        # hotel bills, not a landlord's lost rent: no verdict either way.
        if m.group(0) == "loss of use" and ALE_ONLY_RE.search(t) and not re.search(r"rent", t):
            continue
        # Status sits on this line or to its right on the same row.
        row = [t[m.end():]] + [
            norm(l.text) for l in doc.lines
            if l is not line and l.page == line.page and abs(l.cy - line.cy) <= max(3.0, 0.6 * line.h) and is_right_of(line, l)
        ]
        status = " ".join(row)
        if EXCLUDED_RE.search(status) or EXCLUDED_RE.search(t[: m.start()]):
            if verdict is None:
                verdict = False
            continue
        if INCLUDED_RE.search(status) or len(t) <= 60:
            return True
    return verdict


def extract_insurance(doc: Document) -> dict:
    text = norm(doc.text)
    out: dict = {}
    pt = policy_type(doc)
    wind, aop = deductibles(doc)
    prem = annual_premium(doc)
    rent = _coverage_flag(doc, RENT_RE)
    water = _coverage_flag(doc, WATER_RE)
    if pt:
        out["policyType"] = pt
    if wind:
        out["windHailDeductible"] = wind
    if aop:
        out["aopDeductible"] = aop
    if rent is not None:
        out["hasLossOfRent"] = rent
    if water is not None:
        out["hasWaterBackup"] = water
    if prem:
        out["annualPremium"] = prem
    core = [k for k in ("policyType", "windHailDeductible", "aopDeductible", "annualPremium") if k in out]
    if not core and not INS_DOC_RE.search(text):
        return {"error": "not_an_insurance_document"}
    return out
