from __future__ import annotations

import json
from typing import Any

import httpx


class GeminiClient:
    def __init__(self, api_key: str, timeout_seconds: float = 15.0) -> None:
        self._api_key = api_key
        self._timeout = timeout_seconds

    def generate_json(self, model: str, prompt: str) -> dict[str, Any] | None:
        if not self._api_key or not model:
            return None
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]},
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 900,
            },
        }
        try:
            response = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                params={"key": self._api_key},
                json=payload,
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
            text = _extract_text(data)
            if not text:
                return None
            return _extract_json(text)
        except Exception:
            return None


def _extract_text(data: dict[str, Any]) -> str | None:
    candidates = data.get("candidates", [])
    if not candidates:
        return None
    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    if not parts:
        return None
    return parts[0].get("text")


def _extract_json(text: str) -> dict[str, Any] | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    snippet = text[start : end + 1]
    try:
        return json.loads(snippet)
    except Exception:
        return None
