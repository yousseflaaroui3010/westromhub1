# extractor: document reader (Docling + rules, no AI)

Reads Texas notices of appraised value and insurance declarations pages for
`/api/extract-tax` and `/api/extract-insurance`. It runs as a **private**
Railway service (no public domain). The API calls it over the private
network with `X-Extractor-Token`. Documents are never stored or sent to a
third party, and no document text is logged.

## How it works

1. **Docling** turns the upload into positioned text lines:
   - **PDF with a text layer:** the embedded text is read exactly, with no OCR (about 1 to 4 s).
   - **Scan or photo:** Docling's RapidOCR pipeline reads it on the CPU (about 5 to 15 s).
   - **PDF with almost no text:** it is treated as a scan and OCR'd.
2. **Rules** (`tax.py`, `insurance.py`) find each value by layout, not by
   fixed coordinates. A value can be on the same line as its label, to its
   right on the same row, or under it in the same column.
   - **Tax notices:**
     - The reader resolves a *kind* × *period* grid (market or appraised × current or prior), whether years are rows, columns, merged rows or two-line headers.
     - It compares like with like: market with market when both years have it, otherwise appraised with appraised.
     - It reads the situs address, never the mailing address.
   - **Insurance declarations pages:**
     - Policy form: DP-1/2/3, HO-3, Texas HO-A/B, TDP, ISO "DP 00 03".
     - Wind/hail and all-other-perils deductibles: a percentage is preferred over its dollar equivalent.
     - Premium: by label priority, ignoring installment amounts.
     - Loss of rent and water backup are tri-state. They are `true` only if listed, `false` only if explicitly excluded, and absent if not mentioned, so a missing page is never reported as a coverage gap.
3. Anything not found is left out, and the owner types it in. **A missing
   value is safe; a wrong one is not.** The test bar is zero wrong values.

## Run and test

```bash
pip install -r requirements-dev.txt
python -m pytest -q tests/test_parsers.py   # fast, no models
python -m pytest -q tests/test_corpus.py    # end to end through Docling
python -m tests.evaluate --variants pdf,scan,photo,scanpdf --seeds 1,2,3
python -m wgc_extract.cli tax some-notice.pdf --lines
uvicorn wgc_extract.server:app --port 8080
```

`tests/corpus.py` generates notices and declarations pages in the layout
styles of the real ones, with known answers. It also generates scans (rotation,
noise, JPEG artifacts), phone photos (perspective, uneven light) and image-only
PDFs. `tests/fixtures/comptroller_50-778.pdf` is the Texas Comptroller's
public model notice form, which the corpus fills in.

## Environment

| Variable | Default | |
|---|---|---|
| `EXTRACTOR_TOKEN` | (none) | Shared secret; must equal the API's `EXTRACTOR_TOKEN` |
| `EXTRACT_CONCURRENCY` | 1 | Parallel conversions (CPU-bound) |
| `EXTRACT_TIMEOUT_S` | 75 | Per request |
| `EXTRACT_MAX_PAGES` | 4 | Pages read per document |
| `EXTRACT_MAX_BYTES` | 12 MB | |

On the API: `EXTRACTOR_URL=http://extractor.railway.internal:8080` and the same `EXTRACTOR_TOKEN`.
