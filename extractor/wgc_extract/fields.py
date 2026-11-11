"""Value parsers and layout search shared by the tax and insurance readers.

Forms put a value in one of three places relative to its label:
  1. on the same text line after it    "Total Premium: $1,840"
  2. to the right on the same row      "Coverage A ........ $158,000"
  3. under it, in the same column      "Last Year Appraised Value" / "$240,000"
`values_near` tries them in that order and returns every candidate with a
distance, so callers can apply their own preferences.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, Iterable, Optional

from .reader import Document, Line

# OCR confusions inside numbers: O->0, l/I->1, S->5 only between digits.
_OCR_DIGIT = str.maketrans({"O": "0", "o": "0", "I": "1", "l": "1"})

MONEY_RE = re.compile(
    r"""(?<![\w.])
        (?P<neg>-)?\$?\s?(?P<neg2>-)?
        (?P<num>\d{1,3}(?:[,\s]\d{3})+|\d+)
        (?P<cents>\.\d{2})?
        (?![\d%])""",
    re.X,
)
PCT_RE = re.compile(r"(?<![\d.])(\d{1,2}(?:\.\d{1,2})?)\s?%")
YEAR_RE = re.compile(r"\b(20[1-4]\d)\b")


def norm(s: str) -> str:
    s = s.replace("’", "'").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip().lower()


def _fix_ocr_digits(s: str) -> str:
    # Only touch tokens that are mostly digits ("$1O0,000" -> "$100,000").
    def fix(m: re.Match[str]) -> str:
        tok = m.group(0)
        digits = sum(ch.isdigit() for ch in tok)
        return tok.translate(_OCR_DIGIT) if digits >= max(2, len(tok) // 2) else tok

    return re.sub(r"\$?[\dOolI][\dOolI,.]*", fix, s)


def money_values(text: str, *, require_dollar: bool = False) -> list[int]:
    """All dollar amounts in `text`, in order. Years and tiny ints are skipped
    unless they carry a $ sign."""
    out: list[int] = []
    t = _fix_ocr_digits(text)
    for m in MONEY_RE.finditer(t):
        raw = m.group(0)
        has_dollar = "$" in raw
        if require_dollar and not has_dollar:
            continue
        num = m.group("num").replace(",", "").replace(" ", "")
        if not num.isdigit():
            continue
        v = int(num)
        if not has_dollar:
            grouped = "," in m.group("num") or " " in m.group("num")
            if not grouped:
                # A bare number (ZIP code, account no.) is money only when it
                # is the whole cell, e.g. a table cell holding "250000".
                if v < 1000 or YEAR_RE.fullmatch(num) or t.strip() != raw.strip():
                    continue
        if m.group("neg") or m.group("neg2"):
            continue
        out.append(v)
    return out


def pct_values(text: str) -> list[float]:
    return [float(m.group(1)) for m in PCT_RE.finditer(text)]


@dataclass
class Hit:
    line: Line
    value: object
    distance: float
    how: str  # "same", "right", "below", "above"


def find_lines(doc: Document, pattern: re.Pattern[str]) -> list[tuple[Line, re.Match[str]]]:
    out = []
    for l in doc.lines:
        m = pattern.search(norm(l.text))
        if m:
            out.append((l, m))
    return out


def same_row(a: Line, b: Line, tol: float = 0.6) -> bool:
    if a.page != b.page:
        return False
    h = min(a.h, b.h)
    return abs(a.cy - b.cy) <= max(3.0, tol * h)


def is_right_of(label: Line, b: Line) -> bool:
    """b starts to the right of label (OCR boxes may overlap a little)."""
    cx = (b.x0 + b.x1) / 2
    return cx > label.x1 and b.x0 >= label.x1 - 0.5 * label.h - 2


def is_below(label: Line, b: Line) -> bool:
    """b sits on a lower row than label (centre clearly lower)."""
    return b.page == label.page and b.cy >= label.cy + 0.55 * min(label.h, b.h) and b.y0 >= label.y0


def is_above(label: Line, b: Line) -> bool:
    return b.page == label.page and b.cy <= label.cy - 0.55 * min(label.h, b.h) and b.y1 <= label.y1


def x_overlap(a: Line, b: Line, pad: float = 0.0) -> float:
    return min(a.x1 + pad, b.x1 + pad) - max(a.x0 - pad, b.x0 - pad)


def values_near(
    doc: Document,
    label: Line,
    match_end: int,
    parse: Callable[[str], list],
    *,
    directions: Iterable[str] = ("same", "right", "below"),
    max_below_lines: float = 3.2,
    max_right: float = 480.0,
) -> list[Hit]:
    """Candidates for the value belonging to `label`, nearest first per direction."""
    hits: list[Hit] = []
    dirs = tuple(directions)
    if "same" in dirs:
        rest = norm(label.text)[match_end:]
        for v in parse(rest):
            hits.append(Hit(label, v, 0.0, "same"))
    if "right" in dirs:
        row = [
            l for l in doc.lines
            if l is not label and same_row(label, l) and is_right_of(label, l) and l.x0 - label.x1 <= max_right
        ]
        for l in sorted(row, key=lambda l: l.x0):
            for v in parse(norm(l.text)):
                hits.append(Hit(l, v, 1 + (l.x0 - label.x1), "right"))
                break
    if "below" in dirs:
        lim = label.y1 + max_below_lines * label.h + 6
        col = [
            l for l in doc.lines
            if l is not label and is_below(label, l) and l.y0 <= lim and x_overlap(label, l, pad=6) > 0
        ]
        for l in sorted(col, key=lambda l: l.y0):
            for v in parse(norm(l.text)):
                hits.append(Hit(l, v, 1000 + max(0.0, l.y0 - label.y1), "below"))
                break
    if "above" in dirs:
        col = [
            l for l in doc.lines
            if l is not label and is_above(label, l)
            and label.y0 - l.y1 <= 2.5 * label.h and x_overlap(label, l, pad=6) > 0
        ]
        for l in sorted(col, key=lambda l: -l.y1):
            for v in parse(norm(l.text)):
                hits.append(Hit(l, v, 2000 + max(0.0, label.y0 - l.y1), "above"))
                break
    return hits


def first(hits: list[Hit]) -> Optional[Hit]:
    return min(hits, key=lambda h: h.distance) if hits else None


def is_sentence(line: Line, max_words: int = 14) -> bool:
    """Long running text (policy language, instructions) rather than a field."""
    return len(line.text.split()) > max_words
