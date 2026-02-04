from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Iterable

import httpx


def _parse_job_ids(args: argparse.Namespace) -> list[str]:
    if args.job_ids:
        return args.job_ids
    if args.upload_json:
        with open(args.upload_json, "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = json.load(sys.stdin)
    jobs = payload.get("analysis_jobs") or []
    ids = [j.get("analysis_job_id") for j in jobs if j.get("analysis_job_id")]
    if not ids:
        raise SystemExit("No analysis_job_id found in upload response.")
    return ids


def _print_status(
    statuses: dict[str, dict],
    *,
    prefix: str = "",
) -> None:
    pending = [j for j in statuses.values() if j["status"] not in {"DONE", "FAILED"}]
    done = [j for j in statuses.values() if j["status"] == "DONE"]
    failed = [j for j in statuses.values() if j["status"] == "FAILED"]
    summary = f"{len(done)}/{len(statuses)} DONE, {len(pending)} pending, {len(failed)} failed"
    if prefix:
        summary = f"{prefix} {summary}"
    print(summary, flush=True)


def _fetch_status(base_url: str, job_id: str) -> dict:
    url = f"{base_url.rstrip('/')}/analysis-jobs/{job_id}"
    with httpx.Client(timeout=5.0) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.json()


def watch_jobs(
    base_url: str,
    job_ids: Iterable[str],
    poll_seconds: float,
) -> int:
    job_ids = list(job_ids)
    statuses: dict[str, dict] = {}
    print(f"Watching {len(job_ids)} jobs...", flush=True)
    while True:
        for job_id in job_ids:
            try:
                statuses[job_id] = _fetch_status(base_url, job_id)
            except Exception as exc:
                statuses[job_id] = {
                    "job_id": job_id,
                    "status": "ERROR",
                    "error_message": str(exc),
                }
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        _print_status(statuses, prefix=now)

        # Emit per-job lines for easy tailing
        for job_id in job_ids:
            s = statuses[job_id]
            print(
                f"  {job_id} {s.get('status')}"
                f" updated={s.get('updated_at')}"
                f" error={s.get('error_message')}",
                flush=True,
            )

        if all(s.get("status") in {"DONE", "FAILED"} for s in statuses.values()):
            return 0 if all(s.get("status") == "DONE" for s in statuses.values()) else 2
        time.sleep(poll_seconds)


def main() -> int:
    parser = argparse.ArgumentParser(description="Watch analysis jobs until all complete.")
    parser.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="API base URL",
    )
    parser.add_argument(
        "--poll",
        type=float,
        default=2.0,
        help="Polling interval in seconds",
    )
    parser.add_argument(
        "--upload-json",
        help="Path to upload response JSON containing analysis_jobs",
    )
    parser.add_argument("job_ids", nargs="*")
    args = parser.parse_args()

    try:
        job_ids = _parse_job_ids(args)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON: {exc}")

    return watch_jobs(args.base_url, job_ids, args.poll)


if __name__ == "__main__":
    raise SystemExit(main())
