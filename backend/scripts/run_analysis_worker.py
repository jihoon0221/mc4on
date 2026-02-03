from __future__ import annotations

import os
import time

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.analysis_jobs import fetch_next_job, process_job


def run_worker(poll_seconds: int = 5) -> None:
    while True:
        with SessionLocal() as db:
            job = fetch_next_job(db)
            if job is None:
                time.sleep(poll_seconds)
                continue
            process_job(db, job)


if __name__ == "__main__":
    poll = int(os.getenv("ANALYSIS_POLL_SECONDS", "5"))
    run_worker(poll_seconds=poll)
