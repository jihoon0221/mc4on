#!/usr/bin/env python3
from __future__ import annotations

import csv
import io
import json
import os
from datetime import datetime
from typing import Iterable

import httpx


def _to_kakao_line(ts: datetime, sender: str, content: str) -> list[str]:
    ampm = "오전" if ts.hour < 12 else "오후"
    hour = ts.hour % 12
    if hour == 0:
        hour = 12
    time_str = f"{hour}:{ts.minute:02d}"
    date_str = f"{ts.year}. {ts.month}. {ts.day}."
    lines = content.splitlines() or [""]
    first = f"{date_str} {ampm} {time_str}, {sender} : {lines[0]}"
    return [first, *lines[1:]]


def _build_kakao_text(rows: Iterable[dict[str, str]]) -> str:
    output_lines: list[str] = []
    for row in rows:
        raw_date = (row.get("Date") or "").strip()
        sender = (row.get("User") or "").strip() or "알 수 없음"
        content = (row.get("Message") or "").strip()
        if not raw_date:
            continue
        try:
            ts = datetime.strptime(raw_date, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            # Fallback: try ISO-like parsing
            ts = datetime.fromisoformat(raw_date.replace("/", "-"))
        output_lines.extend(_to_kakao_line(ts, sender, content))
    return "\n".join(output_lines)


def main() -> None:
    base_url = os.getenv("BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    csv_path = os.getenv(
        "CSV_PATH",
        "/home/ubuntu/apps/mc4on/backend/app/services/김예은테스트.csv",
    )
    out_path = os.getenv("OUT", "/tmp/kakao_csv_test.json")
    me_name = os.getenv("ME_NAME")

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        kakao_text = _build_kakao_text(reader)

    if not kakao_text.strip():
        raise SystemExit("CSV에 유효한 대화 내용이 없습니다.")

    files = {"chat_file": ("kakao_from_csv.txt", kakao_text.encode("utf-8"), "text/plain")}
    data = {"sync_analysis": "true", "force": "true"}
    if me_name:
        data["me_name"] = me_name

    with httpx.Client(timeout=30.0) as client:
        client.post(f"{base_url}/dev/reset?clear_files=true").raise_for_status()
        upload = client.post(f"{base_url}/upload/kakao", files=files, data=data)
        upload.raise_for_status()
        payload = upload.json()
        timeline = client.get(f"{base_url}/timeline?limit=60").json()
        reports = client.get(f"{base_url}/reports/history?limit=30").json()

    result = {"upload": payload, "timeline": timeline, "reports_history": reports}
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
