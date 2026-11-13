"""Accuracy report over the synthetic + real corpus.

    python -m tests.evaluate [--variants pdf,scan,photo,scanpdf] [--seeds 1,2,3]
                             [--real DIR] [--json out.json] [--only NAME]

Scoring per field:
  ok       value matches
  miss     expected, not returned            (user types it in; safe)
  WRONG    returned a different value         (dangerous: user may trust it)
  EXTRA    returned a coverage verdict the document does not support
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

from wgc_extract import extract_insurance, extract_tax
from wgc_extract.reader import read

from . import corpus

HERE = Path(__file__).parent
FORM_50778 = HERE / "fixtures" / "comptroller_50-778.pdf"

# Real, public specimen declarations pages filed with TDI (TWIA, windstorm
# only). Expected values were read off the documents by hand.
REAL_INSURANCE = {
    "tdi_p122126dp.pdf": dict(windHailDeductible="1%", annualPremium=768),
    "tdi_p122128dp.pdf": dict(windHailDeductible="1%", annualPremium=768),
    "tdi_p122129dp.pdf": dict(windHailDeductible="1%", annualPremium=768),
    "tdi_decpg_ten.pdf": dict(windHailDeductible="1%", annualPremium=235),
    "tdi_decpg_condo.pdf": dict(windHailDeductible="1%"),
}
# Documents that are neither: both readers must refuse them.
WRONG_DOCS = ["cleaning_invoice.pdf", "move_out_report.pdf", "make_ready_invoice.pdf"]


def _street(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", s.lower().split(",")[0]).strip()


def same(field: str, got, want) -> bool:
    if field == "address":
        return _street(str(got)).startswith(_street(str(want)))
    if field in ("windHailDeductible", "aopDeductible"):
        return str(got).replace(".0%", "%") == str(want)
    return got == want


def score(out: dict, truth: dict, optional: set[str], kind: str) -> dict[str, str]:
    res: dict[str, str] = {}
    for k, want in truth.items():
        if k not in out:
            res[k] = "miss" if k not in optional else "ok?"
        elif same(k, out[k], want):
            res[k] = "ok"
        else:
            res[k] = "WRONG"
    if kind == "insurance":
        for k in ("hasLossOfRent", "hasWaterBackup"):
            if k not in truth and k in out:
                res[k] = "EXTRA"
    return res


def variants_of(case: corpus.Case, names: list[str], seed: int) -> list[tuple[str, bytes]]:
    out = []
    multipage = case.pdf.count(b"/Type /Page") > 2 or case.name.startswith("tax_dallas")
    for v in names:
        if v == "pdf":
            out.append((v, case.pdf))
            continue
        png = corpus.stack_pages(case.pdf) if multipage else corpus.render_png(case.pdf)
        if v == "scan":
            out.append((v, corpus.degrade(png, "scan", seed)))
        elif v == "photo":
            out.append((v, corpus.degrade(png, "photo", seed)))
        elif v == "scanpdf":
            out.append((v, corpus.image_pdf(corpus.degrade(png, "scan", seed + 7))))
    return out


def run(args) -> dict:
    seeds = [int(s) for s in args.seeds.split(",")]
    names = args.variants.split(",")
    cases = corpus.build(seeds, FORM_50778)
    if args.only:
        cases = [c for c in cases if args.only in c.name]
    rows = []
    tally: dict[str, Counter] = defaultdict(Counter)
    for case in cases:
        for vname, data in variants_of(case, names, seeds[0]):
            t = time.time()
            doc = read(data)
            out = extract_tax(doc) if case.kind == "tax" else extract_insurance(doc)
            secs = time.time() - t
            res = score(out, case.truth, case.optional, case.kind)
            for k, v in res.items():
                tally[f"{case.kind}:{vname}"][v] += 1
                tally[f"field:{k}"][v] += 1
            bad = {k: (out.get(k), case.truth.get(k)) for k, v in res.items() if v in ("WRONG", "miss", "EXTRA")}
            # The same document through the OTHER reader (wrong upload box)
            # must be refused or yield nothing, never fields.
            other = extract_insurance(doc) if case.kind == "tax" else extract_tax(doc)
            if "error" not in other:
                core = {k: v for k, v in other.items() if k in ("currentValue", "priorValue", "policyType", "annualPremium", "windHailDeductible", "aopDeductible")}
                if core:
                    bad["cross_reader"] = (core, "error")
                    tally["cross_reader"]["WRONG"] += 1
                else:
                    tally["cross_reader"]["ok"] += 1
            else:
                tally["cross_reader"]["ok"] += 1
            rows.append(dict(case=case.name, variant=vname, secs=round(secs, 1), ocr=doc.ocr, bad=bad))
            flag = "PASS" if not bad else "FAIL"
            print(f"{flag} {case.name:22} {vname:8} {secs:5.1f}s  {bad if bad else ''}", flush=True)

    if args.real:
        real = Path(args.real)
        for name, truth in REAL_INSURANCE.items():
            p = real / name
            if not p.exists():
                continue
            out = extract_insurance(read(p.read_bytes()))
            res = score(out, truth, set(), "insurance")
            bad = {k: (out.get(k), truth.get(k)) for k, v in res.items() if v in ("WRONG", "miss", "EXTRA")}
            for k, v in res.items():
                tally["real:insurance"][v] += 1
            print(f"{'PASS' if not bad else 'FAIL'} real/{name:18} pdf  {bad if bad else ''}", flush=True)
            rows.append(dict(case=f"real/{name}", variant="pdf", bad=bad))
        for name in WRONG_DOCS:
            for p in [real / name]:
                if p.exists():
                    doc = read(p.read_bytes())
                    t, i = extract_tax(doc), extract_insurance(doc)
                    ok = "error" in t and "error" in i
                    tally["wrong_doc"]["ok" if ok else "WRONG"] += 1
                    print(f"{'PASS' if ok else 'FAIL'} wrongdoc/{name:18}  tax={t} ins={i}", flush=True)
                    break

    print("\n=== Summary ===")
    for k in sorted(tally):
        c = tally[k]
        n = sum(c.values())
        print(f"{k:24} n={n:3}  ok={c['ok'] + c['ok?']:3}  miss={c['miss']:3}  WRONG={c['WRONG']:3}  EXTRA={c['EXTRA']:3}")
    fails = [r for r in rows if r["bad"]]
    print(f"\ndocuments: {len(rows)}  fully correct: {len(rows) - len(fails)}")
    result = dict(rows=rows, tally={k: dict(v) for k, v in tally.items()})
    if args.json:
        Path(args.json).write_text(json.dumps(result, indent=1))
    return result


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", default="pdf")
    ap.add_argument("--seeds", default="1")
    ap.add_argument("--real")
    ap.add_argument("--json")
    ap.add_argument("--only")
    a = ap.parse_args()
    run(a)
    sys.exit(0)
