"""Private HTTP service: POST a document, get fields back.

    POST /extract/tax         body = raw PDF/PNG/JPEG/WEBP/HEIC bytes
    POST /extract/insurance   header X-Extractor-Token: $EXTRACTOR_TOKEN
    GET  /health

Only the API calls this, over Railway's private network; it has no public
domain. The token is defence in depth. Nothing is written to disk and no
document text is logged, only sizes, timings and which fields were found.
"""

from __future__ import annotations

import asyncio
import hmac
import logging
import os
import threading
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from . import extract_insurance, extract_tax
from .reader import read, warm_up

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"), format="%(levelname)s %(name)s %(message)s")
log = logging.getLogger("wgc_extract.server")

TOKEN = os.environ.get("EXTRACTOR_TOKEN", "")
MAX_BYTES = int(os.environ.get("EXTRACT_MAX_BYTES", str(12 * 1024 * 1024)))
TIMEOUT_S = float(os.environ.get("EXTRACT_TIMEOUT_S", "75"))
# Docling is CPU-bound; more parallel conversions only make each one slower.
SLOTS = asyncio.Semaphore(int(os.environ.get("EXTRACT_CONCURRENCY", "1")))
QUEUE_WAIT_S = float(os.environ.get("EXTRACT_QUEUE_WAIT_S", "45"))

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
_ready = threading.Event()


@app.on_event("startup")
def _startup() -> None:
    if not TOKEN:
        log.warning("EXTRACTOR_TOKEN is not set: requests are not authenticated (dev only)")

    def warm() -> None:
        t = time.time()
        try:
            warm_up()
            log.info("models loaded in %.1fs", time.time() - t)
        finally:
            _ready.set()

    threading.Thread(target=warm, daemon=True).start()


def _err(status: int, code: str) -> JSONResponse:
    return JSONResponse({"error": code}, status_code=status)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "ready": _ready.is_set()}


async def _handle(request: Request, kind: str) -> JSONResponse:
    if TOKEN and not hmac.compare_digest(request.headers.get("x-extractor-token", ""), TOKEN):
        return _err(403, "forbidden")
    body = await request.body()
    if not body:
        return _err(400, "empty_body")
    if len(body) > MAX_BYTES:
        return _err(413, "too_large")
    try:
        await asyncio.wait_for(SLOTS.acquire(), timeout=QUEUE_WAIT_S)
    except asyncio.TimeoutError:
        return _err(503, "busy")
    t = time.time()
    task = asyncio.ensure_future(asyncio.to_thread(read, body))
    # The slot is held until the conversion thread really finishes, even if
    # we stop waiting for it, so a slow document cannot stack up CPU work.
    task.add_done_callback(lambda _t: SLOTS.release())
    try:
        doc = await asyncio.wait_for(asyncio.shield(task), timeout=TIMEOUT_S)
        out = extract_tax(doc) if kind == "tax" else extract_insurance(doc)
    except asyncio.TimeoutError:
        log.warning("%s: timed out after %.0fs (%d bytes)", kind, TIMEOUT_S, len(body))
        return _err(504, "timeout")
    except ValueError as e:
        if str(e) == "unsupported_type":
            return _err(415, "unsupported_type")
        log.warning("%s: unreadable document (%s)", kind, type(e).__name__)
        return _err(422, "unreadable")
    except Exception as e:  # noqa: BLE001 - never leak internals
        log.warning("%s: conversion failed (%s)", kind, type(e).__name__)
        return _err(422, "unreadable")
    log.info(
        "%s: %d bytes, %d pages, ocr=%s, %.1fs, fields=%s",
        kind, len(body), doc.pages, doc.ocr, time.time() - t, ",".join(sorted(k for k in out if k != "error")) or out.get("error", "-"),
    )
    return JSONResponse(out)


@app.post("/extract/tax")
async def tax(request: Request) -> JSONResponse:
    return await _handle(request, "tax")


@app.post("/extract/insurance")
async def insurance(request: Request) -> JSONResponse:
    return await _handle(request, "insurance")
