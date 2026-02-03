from __future__ import annotations

import json
from typing import Any

import httpx


class HuggingFaceClient:
    def __init__(self, api_key: str, timeout_seconds: float = 15.0) -> None:
        self._api_key = api_key
        self._timeout = timeout_seconds

    def generate_json(self, model: str, prompt: str) -> dict[str, Any] | None:
        if not self._api_key or not model:
            return None
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 800,
                "temperature": 0.2,
                "return_full_text": False,
            },
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            response = httpx.post(
                f"https://api-inference.huggingface.co/models/{model}",
                json=payload,
                headers=headers,
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
            text = _extract_generated_text(data)
            if not text:
                return None
            return _extract_json(text)
        except Exception:
            return None


def _extract_generated_text(data: Any) -> str | None:
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            return first.get("generated_text")
    if isinstance(data, dict):
        return data.get("generated_text")
    return None


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
