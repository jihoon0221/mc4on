from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CheckDetail:
    provider: str | None = None
    verdict: str | None = None
    score: float | None = None
    reasons: list[str] | None = None
    raw: dict[str, Any] | None = None
    request_id: str | None = None


class SimpleTTLCache:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._items: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        now = time.time()
        stored = self._items.get(key)
        if not stored:
            return None
        expires_at, value = stored
        if now >= expires_at:
            self._items.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._items[key] = (time.time() + self._ttl, value)
