"""Build-time smoke test: both pipelines load and read a known value.

Run by the Dockerfile after the models are baked in, so a broken model
download fails the build instead of the first customer upload.
"""

import io
import sys

from PIL import Image, ImageDraw, ImageFont

from . import extract_insurance, extract_tax
from .reader import read

PDF = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 230>>stream
BT /F1 14 Tf 50 740 Td (DALLAS CENTRAL APPRAISAL DISTRICT) Tj ET
BT /F1 12 Tf 50 715 Td (2026 NOTICE OF APPRAISED VALUE) Tj ET
BT /F1 11 Tf 50 680 Td (2025 Market Value: $210,000) Tj ET
BT /F1 11 Tf 50 664 Td (2026 Market Value: $246,500) Tj ET
endstream endobj
trailer<</Root 1 0 R>>
"""


def main() -> int:
    tax = extract_tax(read(PDF))
    assert tax.get("currentValue") == 246500 and tax.get("priorValue") == 210000, tax

    img = Image.new("RGB", (1400, 500), "white")
    d = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=40)
    d.text((60, 60), "POLICY DECLARATIONS - DP-3", fill="black", font=font)
    d.text((60, 160), "Total Annual Premium   $1,842", fill="black", font=font)
    d.text((60, 260), "Wind/Hail Deductible   2%", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    ins = extract_insurance(read(buf.getvalue()))
    assert ins.get("annualPremium") == 1842 and ins.get("windHailDeductible") == "2%", ins
    print("selftest ok", tax, ins)
    return 0


if __name__ == "__main__":
    sys.exit(main())
