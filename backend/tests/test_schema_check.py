import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app import schema_check
from app.main import create_app
from app.schema_check import schema_problems, warn_if_schema_out_of_step

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def migrate(database_url: str, revision: str = "head") -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(config, revision)


def test_given_a_database_at_the_latest_migration_when_it_is_checked_then_there_is_nothing_to_report(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'current.db'}"
    migrate(database_url)

    assert schema_problems(create_engine(database_url)) == []


def test_given_a_database_one_migration_behind_when_it_is_checked_then_it_says_to_upgrade(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'behind.db'}"
    migrate(database_url, "head-1")

    problems = schema_problems(create_engine(database_url))

    assert any("alembic upgrade head" in problem and "migration" in problem for problem in problems)


def test_given_a_database_missing_a_table_when_it_is_checked_then_the_table_is_named(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'missing.db'}"
    migrate(database_url)
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(text("DROP TABLE calendar_event"))

    problems = schema_problems(engine)

    assert any("calendar_event" in problem for problem in problems)


def test_given_an_empty_database_when_it_is_checked_then_it_says_no_migration_has_run():
    problems = schema_problems(create_engine("sqlite://"))

    assert any("no migration" in problem for problem in problems)


def test_given_an_out_of_step_database_when_it_is_checked_then_a_warning_is_logged(caplog):
    with caplog.at_level(logging.WARNING, logger="app.schema_check"):
        warn_if_schema_out_of_step(create_engine("sqlite://"))

    assert any(record.levelno == logging.WARNING for record in caplog.records)
    assert "alembic upgrade head" in caplog.text


def test_given_a_database_that_cannot_be_read_when_it_is_checked_then_startup_carries_on_with_a_warning(
    monkeypatch, caplog
):
    def unreadable(engine):
        raise OSError("disk unplugged")

    monkeypatch.setattr(schema_check, "schema_problems", unreadable)

    with caplog.at_level(logging.WARNING, logger="app.schema_check"):
        warn_if_schema_out_of_step(create_engine("sqlite://"))

    assert "Could not check the database" in caplog.text


def test_given_the_app_when_it_starts_then_it_checks_the_database(monkeypatch):
    checked = []
    monkeypatch.setattr("app.main.warn_if_schema_out_of_step", lambda engine: checked.append(engine))

    with TestClient(create_app()):
        pass

    assert len(checked) == 1
