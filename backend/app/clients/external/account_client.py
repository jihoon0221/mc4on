from __future__ import annotations

import hashlib

import httpx

from app.clients.external.base import CheckDetail, SimpleTTLCache


class AccountRiskClient:
    def __init__(self, api_key: str, base_url: str, timeout_seconds: float, cache_ttl_seconds: int) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds
        self._cache = SimpleTTLCache(cache_ttl_seconds)

    def check(self, account: str) -> tuple[bool, CheckDetail | None]:
        key = hashlib.sha256(account.encode("utf-8")).hexdigest()
        cached = self._cache.get(key)
        if cached:
            return cached
        if not self._api_key or not self._base_url:
            return False, None
        try:
            response = httpx.post(
                f"{self._base_url}/check",
                json={"account": account},
                headers={"Authorization": f"Bearer {self._api_key}"},
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
            verdict = payload.get("verdict", "unknown")
            risky = verdict in {"suspicious", "malicious"}
            detail = CheckDetail(
                provider="account_risk",
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


def _safe_raw(payload: dict) -> dict:
    return payload
