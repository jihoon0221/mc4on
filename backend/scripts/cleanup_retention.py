from app.db.session import SessionLocal
from app.services.retention import cleanup_retention


def main() -> None:
    db = SessionLocal()
    try:
        removed = cleanup_retention(db)
        print(f"removed_files={removed}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
