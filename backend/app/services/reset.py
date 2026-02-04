from __future__ import annotations

from pathlib import Path
import shutil

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.cache import clear_all_caches


_TABLES = [
    "report_requests",
    "entity_checks",
    "timeline_entries",
    "analysis_jobs",
    "quiz_items",
    "learning_contents",
    "risk_events",
    "analysis_results",
    "detected_entities",
    "messages",
    "uploads",
    "conversations",
    "users",
]


def reset_database(db: Session) -> None:
    table_list = ", ".join(_TABLES)
    db.execute(text(f"TRUNCATE TABLE {table_list} RESTART IDENTITY CASCADE"))
    db.commit()


def reset_data_dir() -> None:
    data_dir = Path(settings.data_dir)
    if not data_dir.exists():
        return
    for child in data_dir.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink(missing_ok=True)


def reset_all(db: Session, clear_files: bool = False) -> None:
    reset_database(db)
    if clear_files:
        reset_data_dir()
    clear_all_caches()
