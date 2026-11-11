"""Deterministic document reading for wgcassetguide.com (Docling + rules, no AI)."""

from .insurance import extract_insurance
from .tax import extract_tax

__all__ = ["extract_insurance", "extract_tax"]
