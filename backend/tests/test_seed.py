from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Wedding
from app.seed import main, seed_wedding


def test_given_an_empty_database_when_it_is_seeded_then_the_wedding_root_is_created(db_session: Session):
    wedding = seed_wedding(db_session, name="La Bodita", wedding_date=date(2026, 10, 29))

    assert wedding.id is not None
    assert wedding.name == "La Bodita"
    assert wedding.wedding_date == date(2026, 10, 29)


def test_given_a_seeded_database_when_it_is_seeded_again_then_no_second_wedding_appears(
    db_session: Session,
):
    """Re-running the seed is a normal thing to do; it must stay a single-tenant database."""
    first = seed_wedding(db_session, name="La Bodita", wedding_date=None)

    second = seed_wedding(db_session, name="Otro nombre", wedding_date=date(2027, 1, 1))

    assert second.id == first.id
    assert second.name == "La Bodita"
    assert len(list(db_session.scalars(select(Wedding)))) == 1


def test_given_command_line_arguments_when_the_seed_runs_then_it_uses_them(
    db_session: Session, monkeypatch, capsys
):
    monkeypatch.setattr("app.seed.SessionLocal", lambda: db_session)

    main(["--name", "La Bodita", "--date", "2026-10-29"])

    seeded = db_session.scalars(select(Wedding)).one()
    assert seeded.name == "La Bodita"
    assert seeded.wedding_date == date(2026, 10, 29)
    assert "La Bodita" in capsys.readouterr().out


def test_given_no_date_argument_when_the_seed_runs_then_the_wedding_has_no_date(
    db_session: Session, monkeypatch, capsys
):
    monkeypatch.setattr("app.seed.SessionLocal", lambda: db_session)

    main([])

    assert db_session.scalars(select(Wedding)).one().wedding_date is None
