"""Turn an uploaded PDF or image into positioned text with Docling.

Everything downstream works on `Page` / `Line` objects (text + box in
top-left page coordinates, points), so the field parsers never touch Docling
and can be unit-tested with hand-built lines.

Strategy:
  * PDF with a text layer: Docling's PDF backend reads the embedded text
    exactly (no OCR, ~1-4 s/page).
  * Scanned PDF or photo: Docling runs RapidOCR (ONNX, CPU) over the page.
  * A PDF whose text layer is missing or nearly empty is retried with
    full-page OCR.

We read text from every item, including text Docling placed inside
"picture" regions (boxed form sections often land there), and every table
cell, so nothing visible on the page is dropped.
"""

from __future__ import annotations

import io
import logging
import os
import re
import threading
from dataclasses import dataclass, field

log = logging.getLogger("wgc_extract.reader")

MAX_PAGES = int(os.environ.get("EXTRACT_MAX_PAGES", "4"))
# Below this many characters a PDF is treated as a scan and OCR'd.
MIN_TEXT_CHARS = 80


@dataclass(frozen=True)
class Line:
    page: int
    x0: float
    y0: float  # top
    x1: float
    y1: float  # bottom
    text: str

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def h(self) -> float:
        return max(1.0, self.y1 - self.y0)


@dataclass
class Table:
    page: int
    cells: dict[tuple[int, int], str]
    n_rows: int
    n_cols: int

    def row(self, r: int) -> list[str]:
        return [self.cells.get((r, c), "") for c in range(self.n_cols)]

    def col(self, c: int) -> list[str]:
        return [self.cells.get((r, c), "") for r in range(self.n_rows)]


@dataclass
class Document:
    lines: list[Line] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)
    ocr: bool = False
    pages: int = 0

    @property
    def text(self) -> str:
        return "\n".join(l.text for l in self.lines)


_converters: dict[str, object] = {}
_lock = threading.Lock()


def _converter(ocr: bool):
    """Build Docling converters once per process (model load is the slow part)."""
    key = "ocr" if ocr else "text"
    with _lock:
        if key in _converters:
            return _converters[key]
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions, RapidOcrOptions
        from docling.document_converter import DocumentConverter, ImageFormatOption, PdfFormatOption

        opts = PdfPipelineOptions(
            do_ocr=ocr,
            do_table_structure=True,
            ocr_options=RapidOcrOptions(force_full_page_ocr=True),
        )
        opts.document_timeout = float(os.environ.get("EXTRACT_DOC_TIMEOUT_S", "70"))
        opts.images_scale = 2.0 if ocr else 1.0
        # Keep docling-parse / OCR text-line cells: layout items merge
        # consecutive key-value lines into paragraphs, lines do not.
        opts.generate_parsed_pages = True
        opts.generate_page_images = False
        opts.generate_picture_images = False
        conv = DocumentConverter(
            allowed_formats=[InputFormat.PDF, InputFormat.IMAGE],
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=opts),
                InputFormat.IMAGE: ImageFormatOption(pipeline_options=opts),
            },
        )
        _converters[key] = conv
        return conv


def warm_up() -> None:
    """Load both pipelines at boot so the first request is not slow."""
    _converter(False)
    _converter(True)


_WS = re.compile(r"\s+")


def _clean(s: str) -> str:
    return _WS.sub(" ", s.replace(" ", " ")).strip()


def _to_document(res, ocr: bool) -> Document:
    """Lines come from Docling's text-line cells (embedded text or OCR), in
    page points with a top-left origin. Tables come from the layout model."""
    out = Document(ocr=ocr, pages=len(res.pages))
    base = min((p.page_no for p in res.pages), default=1)
    for page in res.pages:
        page_no = page.page_no - base + 1  # 1-based regardless of Docling version
        pp = page.parsed_page
        if page_no > MAX_PAGES or pp is None or page.size is None:
            continue
        # OCR cells are in scaled image pixels; embedded text is in points.
        dim = getattr(pp, "dimension", None)
        sx = sy = 1.0
        cells = list(pp.textline_cells or [])
        if cells and any(c.from_ocr for c in cells):
            max_x = max(c.rect.to_bounding_box().r for c in cells)
            if dim is not None and getattr(dim, "width", 0) and dim.width > page.size.width * 1.05:
                sx = page.size.width / dim.width
                sy = page.size.height / dim.height
            elif max_x > page.size.width * 1.05:
                sx = sy = 1.0 / 2.0  # images_scale used for OCR
        for c in cells:
            text = _clean(c.text or "")
            if not text:
                continue
            b = c.rect.to_bounding_box()
            if b.coord_origin.name != "TOPLEFT":
                b = b.to_top_left_origin(page_height=(dim.height if dim is not None else page.size.height))
            out.lines.append(Line(page_no, b.l * sx, b.t * sy, b.r * sx, b.b * sy, text))

    dl_doc = res.document
    for item, _level in dl_doc.iterate_items(traverse_pictures=True):
        if item.label != "table" or not getattr(item, "prov", None) or getattr(item, "data", None) is None:
            continue
        page = item.prov[0].page_no
        cells_ = {
            (c.start_row_offset_idx, c.start_col_offset_idx): _clean(c.text or "")
            for c in item.data.table_cells if _clean(c.text or "")
        }
        out.tables.append(Table(page, cells_, item.data.num_rows, item.data.num_cols))

    # Reading order for the parsers: page, then top-to-bottom, left-to-right.
    out.lines.sort(key=lambda l: (l.page, round(l.y0 / 4), l.x0))
    return out


def _sniff(data: bytes) -> str:
    if data[:5] == b"%PDF-":
        return "pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1", b"ftypmsf1"):
        return "heic"
    raise ValueError("unsupported_type")


def _normalize_image(data: bytes, kind: str) -> bytes:
    """Re-encode images to PNG: fixes EXIF rotation, HEIC and odd modes."""
    from PIL import Image, ImageOps

    if kind == "heic":
        try:
            import pillow_heif  # type: ignore

            pillow_heif.register_heif_opener()
        except ImportError as e:  # pragma: no cover
            raise ValueError("unsupported_type") from e
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("RGB")
    # Phone photos are often 12 MP; OCR gains nothing past ~2600 px.
    longest = max(img.size)
    if longest > 2600:
        scale = 2600 / longest
        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def read(data: bytes) -> Document:
    """Bytes of a PDF/PNG/JPEG/WEBP/HEIC -> positioned text."""
    from docling.datamodel.base_models import DocumentStream

    kind = _sniff(data)
    if kind == "pdf":
        doc = _convert(DocumentStream(name="upload.pdf", stream=io.BytesIO(data)), ocr=False)
        if sum(len(l.text) for l in doc.lines) >= MIN_TEXT_CHARS:
            return doc
        log.info("pdf has little embedded text; running OCR")
        return _convert(DocumentStream(name="upload.pdf", stream=io.BytesIO(data)), ocr=True)
    png = _normalize_image(data, kind)
    return _convert(DocumentStream(name="upload.png", stream=io.BytesIO(png)), ocr=True)


def _convert(stream, ocr: bool) -> Document:
    res = _converter(ocr).convert(stream, page_range=(1, MAX_PAGES), raises_on_error=True)
    return _to_document(res, ocr)
