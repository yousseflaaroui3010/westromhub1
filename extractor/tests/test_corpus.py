"""End-to-end through Docling on the generated corpus (text-layer PDFs).

The bar is zero WRONG values: a missing value is safe (the owner types it),
a wrong one is not. Slow (~1 s/doc after model load); OCR variants are run by
`python -m tests.evaluate --variants scan,photo,scanpdf`.
"""

import pytest

from wgc_extract import extract_insurance, extract_tax
from wgc_extract.reader import read

from . import corpus
from .evaluate import FORM_50778, score

CASES = corpus.build((1, 2), FORM_50778)


@pytest.mark.parametrize("case", CASES, ids=[c.name for c in CASES])
def test_text_pdf(case):
    doc = read(case.pdf)
    out = extract_tax(doc) if case.kind == "tax" else extract_insurance(doc)
    res = score(out, case.truth, case.optional, case.kind)
    assert "WRONG" not in res.values() and "EXTRA" not in res.values(), (out, case.truth)
    assert "miss" not in res.values(), (out, case.truth)
