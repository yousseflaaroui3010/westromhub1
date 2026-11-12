"""Published sample declarations pages through Docling: the original PDF, a
scan (image-only PDF, slightly rotated) and a phone photo of page 1.
Zero wrong values is the bar; a value missing on a degraded copy is allowed
only where listed in `may_miss`.
"""

import io
from pathlib import Path

import pypdfium2 as pdfium
import pytest
from PIL import Image, ImageFilter

from wgc_extract import extract_insurance
from wgc_extract.reader import read

DIR = Path(__file__).parent / "fixtures" / "insurance"
ABSENT = object()

CASES = {
    "bridgford_home_dec.pdf": dict(policyType="Homeowners", aopDeductible="$1,000", hasWaterBackup=True, annualPremium=1390,
                                   hasLossOfRent=ABSENT, windHailDeductible=ABSENT),
    "tdi_p031602current.pdf": dict(windHailDeductible="1%", annualPremium=ABSENT, aopDeductible=ABSENT),
    "tdi_1222decpgman.pdf": dict(policyType="Dwelling", windHailDeductible="2%", annualPremium=2725),
    "tdi_p122130dp.pdf": dict(windHailDeductible="1%", annualPremium=768),
}


def _pages(data: bytes, scale: float, n: int = 3) -> list[Image.Image]:
    pdf = pdfium.PdfDocument(data)
    return [pdf[i].render(scale=scale).to_pil().convert("RGB") for i in range(min(n, len(pdf)))]


def _scan(data: bytes) -> bytes:
    pages = [p.convert("L").rotate(-1.0, expand=True, fillcolor=255) for p in _pages(data, 150 / 72)]
    buf = io.BytesIO()
    pages[0].save(buf, "PDF", save_all=True, append_images=pages[1:], resolution=150)
    return buf.getvalue()


def _photo(data: bytes) -> bytes:
    p = _pages(data, 200 / 72, 1)[0].rotate(2.0, expand=True, fillcolor=(228, 226, 220), resample=Image.BICUBIC)
    buf = io.BytesIO()
    p.filter(ImageFilter.GaussianBlur(1.1)).save(buf, "JPEG", quality=72)
    return buf.getvalue()


VARIANTS = {"pdf": lambda b: b, "scan": _scan, "photo": _photo}


@pytest.mark.parametrize("variant", list(VARIANTS))
@pytest.mark.parametrize("name", list(CASES))
def test_published_declarations(name, variant):
    out = extract_insurance(read(VARIANTS[variant]((DIR / name).read_bytes())))
    for field, want in CASES[name].items():
        if want is ABSENT:
            assert field not in out, (field, out)
        else:
            assert out.get(field) == want, (field, out)
