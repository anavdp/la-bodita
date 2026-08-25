import os
from collections.abc import Generator
from datetime import date

# Set before any `app` import so the module-level engine never binds to the dev database.
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Wedding


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    # A private in-memory database per test: StaticPool keeps every connection on
    # the same one, otherwise each connection would open its own empty database.
    from sqlalchemy.pool import StaticPool

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


@pytest.fixture
def wedding(db_session: Session) -> Wedding:
    wedding = Wedding(name="La Bodita", wedding_date=date(2026, 10, 29))
    db_session.add(wedding)
    db_session.commit()
    return wedding
