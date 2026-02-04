from __future__ import annotations

import hashlib
from pathlib import Path

import httpx

from app.clients.external.base import CheckDetail, SimpleTTLCache


class PhotoRiskClient:
    def __init__(self, api_key: str, base_url: str, timeout_seconds: float, cache_ttl_seconds: int) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._cache = SimpleTTLCache(cache_ttl_seconds)

    def check(self, filename: str, data: bytes) -> tuple[bool, CheckDetail | None]:
        if not self._api_key or not self._base_url:
            return False, None
        key = hashlib.sha256(data).hexdigest()
        cached = self._cache.get(key)
        if cached:
            return cached
        try:
            files = {"file": (filename or "photo.bin", data)}
            response = httpx.post(
                f"{self._base_url}/check",
                files=files,
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
            verdict = payload.get("verdict", "unknown")
            risky = verdict in {"suspicious", "malicious"}
            detail = CheckDetail(
                provider="photo_risk",
                verdict=verdict,
                score=payload.get("score"),
                reasons=payload.get("reasons"),
                request_id=payload.get("request_id"),
                raw=_safe_raw(payload),
            )
            result = (risky, detail)
            self._cache.set(key, result)
            return result
        except Exception:
            return False, None

    def clear_cache(self) -> None:
        self._cache.clear()


def _safe_raw(payload: dict) -> dict:
    return payload
