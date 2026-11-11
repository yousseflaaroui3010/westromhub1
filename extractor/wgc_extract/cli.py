"""python -m wgc_extract.cli tax|insurance FILE [--lines]"""

import json
import sys
import time

from . import extract_insurance, extract_tax
from .reader import read


def main() -> None:
    kind, path = sys.argv[1], sys.argv[2]
    t = time.time()
    doc = read(open(path, "rb").read())
    if "--lines" in sys.argv:
        for l in doc.lines:
            print(f"p{l.page} x{l.x0:5.0f}-{l.x1:5.0f} y{l.y0:5.0f}-{l.y1:5.0f} | {l.text}")
    out = extract_tax(doc) if kind == "tax" else extract_insurance(doc)
    print(json.dumps({"ocr": doc.ocr, "seconds": round(time.time() - t, 1), **out}))


if __name__ == "__main__":
    main()
