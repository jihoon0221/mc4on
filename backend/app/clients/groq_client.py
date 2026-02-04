from __future__ import annotations

import json
from typing import Any

import httpx


class GroqClient:
    def __init__(self, api_key: str, timeout_seconds: float = 15.0) -> None:
        self._api_key = api_key
        self._timeout = timeout_seconds

    def generate_text(self, model: str, prompt: str) -> str | None:
        if not self._api_key or not model:
            return None
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 900,
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
            return _extract_content(data)
        except Exception:
            return None

    def generate_json(self, model: str, prompt: str) -> dict[str, Any] | None:
        if not self._api_key or not model:
            return None
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 900,
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
            content = _extract_content(data)
            if not content:
                return None
            return _extract_json(content)
        except Exception:
            return None


def _extract_content(data: dict[str, Any]) -> str | None:
    choices = data.get("choices", [])
    if not choices:
        return None
    return choices[0].get("message", {}).get("content")


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
