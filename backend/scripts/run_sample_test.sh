#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:8000}
OUT=${OUT:-/tmp/upload.json}

reset_url="$BASE_URL/dev/reset?clear_files=true"
upload_url="$BASE_URL/upload/kakao/sample"

curl -sS -X POST "$reset_url" >/tmp/reset.json
curl -sS -X POST "$upload_url" \
  -F "sync_analysis=true" \
  -F "force=true" | tee "$OUT"

PYTHONPATH=backend backend/.venv/bin/python backend/scripts/watch_analysis_jobs.py \
  --upload-json "$OUT"

echo -e "\n--- timeline ---"
curl -sS "$BASE_URL/timeline?limit=60"

echo -e "\n--- reports/history ---"
curl -sS "$BASE_URL/reports/history?limit=30"
