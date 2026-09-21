"""Create the one WEDDING row a fresh database needs.

Run once after `alembic upgrade head`:

    .venv/bin/python -m app.seed --name "La Bodita" --date 2026-10-29
"""

import argparse
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Wedding


def seed_wedding(session: Session, name: str, wedding_date: date | None) -> Wedding:
    """Return the existing wedding, or create it. Safe to run more than once."""
    existing = session.scalars(select(Wedding).order_by(Wedding.id)).first()
    if existing is not None:
        return existing

    wedding = Wedding(name=name, wedding_date=wedding_date)
    session.add(wedding)
    session.commit()
    return wedding


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Seed the WEDDING tenant root.")
    parser.add_argument("--name", default="La Bodita", help="the wedding's name")
    parser.add_argument(
        "--date",
        dest="wedding_date",
        type=date.fromisoformat,
        default=None,
        help="the wedding date, as YYYY-MM-DD",
    )
    arguments = parser.parse_args(argv)

    session = SessionLocal()
    try:
        wedding = seed_wedding(session, arguments.name, arguments.wedding_date)
        print(f"wedding {wedding.id}: {wedding.name} ({wedding.wedding_date or 'no date yet'})")
    finally:
        session.close()


if __name__ == "__main__":
    main()
