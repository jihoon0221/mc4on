#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from typing import Any

import httpx


def _post_json(client: httpx.Client, url: str, *, data: dict[str, str] | None = None) -> Any:
    resp = client.post(url, data=data)
    resp.raise_for_status()
    return resp.json()


def _get_json(client: httpx.Client, url: str) -> Any:
    resp = client.get(url)
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    base_url = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    out_path = os.getenv("OUT", "/tmp/kakao_sample_test.json")

    with httpx.Client(timeout=30.0) as client:
        _post_json(client, f"{base_url}/dev/reset?clear_files=true")
        upload = _post_json(
            client,
            f"{base_url}/upload/kakao/sample",
            data={"sync_analysis": "true", "force": "true"},
        )
        timeline = _get_json(client, f"{base_url}/timeline?limit=60")
        reports = _get_json(client, f"{base_url}/reports/history?limit=30")

    payload = {
        "upload": upload,
        "timeline": timeline,
        "reports_history": reports,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
