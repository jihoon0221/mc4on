from __future__ import annotations

import os
import time

from app.db.session import SessionLocal
from app.services.retention import cleanup_retention


def run_worker(poll_hours: int = 24) -> None:
    sleep_seconds = max(poll_hours, 1) * 3600
    while True:
        with SessionLocal() as db:
            cleanup_retention(db)
        time.sleep(sleep_seconds)


if __name__ == "__main__":
    poll = int(os.getenv("RETENTION_POLL_HOURS", "24"))
    run_worker(poll_hours=poll)
