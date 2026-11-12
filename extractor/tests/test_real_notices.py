"""Published sample notices from Texas appraisal districts, through Docling.

The Tarrant example is the notice an owner uploaded on 2026-11-12 that was
misread (land value reported as the appraised value). Each is also run as a
phone photo (upscaled, rotated, blurred, JPEG) and as a smaller screenshot.
Zero wrong values is the bar; a missing value is acceptable only where noted.
"""

import io
from pathlib import Path

import pytest
from PIL import Image, ImageFilter

from wgc_extract import extract_tax
from wgc_extract.reader import read

DIR = Path(__file__).parent / "fixtures" / "notices"

CASES = {
    "tarrant_2025_example.png": {"taxYear": 2025, "currentValue": 550000, "priorValue": 460000, "county": "Tarrant County"},
    "fortbend_2024_letter.png": {"taxYear": 2024, "currentValue": 189581, "priorValue": None, "county": "Fort Bend County"},
    "williamson_2026_blank.png": {"currentValue": None, "priorValue": None},
}


def _photo(img: Image.Image) -> bytes:
    p = img.convert("RGB").resize((img.width * 2, img.height * 2), Image.LANCZOS)
    p = p.rotate(2.5, expand=True, fillcolor=(235, 233, 228), resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))
    buf = io.BytesIO()
    p.save(buf, "JPEG", quality=70)
    return buf.getvalue()


def _small(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.resize((int(img.width * 0.8), int(img.height * 0.8)), Image.LANCZOS).save(buf, "PNG")
    return buf.getvalue()


VARIANTS = {"original": lambda p: p.read_bytes(), "photo": lambda p: _photo(Image.open(p)), "small": lambda p: _small(Image.open(p))}


@pytest.mark.parametrize("variant", list(VARIANTS))
@pytest.mark.parametrize("name", list(CASES))
def test_published_notice(name, variant):
    out = extract_tax(read(VARIANTS[variant](DIR / name)))
    for field, want in CASES[name].items():
        assert out.get(field) == want, (field, out)
