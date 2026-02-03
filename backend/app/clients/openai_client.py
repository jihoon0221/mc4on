from __future__ import annotations

import json
import os
from typing import Any

import httpx


class OpenAIClient:
    def __init__(self, api_key: str, base_url: str, timeout_seconds: float = 10.0) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    def structured_response(self, model: str, prompt: str, schema: dict[str, Any]) -> dict[str, Any] | None:
        if not self._api_key:
            return None
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            response = httpx.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
            return _extract_json_from_chat(data)
        except Exception:
            return None


def _extract_json_from_chat(data: dict[str, Any]) -> dict[str, Any] | None:
    choices = data.get("choices", [])
    if not choices:
        return None
    content = choices[0].get("message", {}).get("content", "")
    if not content:
        return None
    try:
        return json.loads(content)
    except Exception:
        return None
    return None
