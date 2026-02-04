from __future__ import annotations

from app.services import ai_digest, ai_summary, external_checks


def clear_all_caches() -> None:
    ai_summary.clear_cache()
    ai_digest.clear_cache()
    external_checks.clear_cache()
