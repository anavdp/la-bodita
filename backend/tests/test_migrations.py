from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect

BACKEND_ROOT = Path(__file__).resolve().parent.parent


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_given_the_alembic_config_when_it_is_loaded_then_the_script_directory_resolves():
    script_directory = ScriptDirectory.from_config(build_alembic_config("sqlite://"))

    assert Path(script_directory.dir) == BACKEND_ROOT / "alembic"
    assert (BACKEND_ROOT / "alembic" / "versions").is_dir()


def test_given_an_empty_sqlite_file_when_migrations_run_then_alembic_connects_and_tracks_the_version(tmp_path):
    database_path = tmp_path / "migration_check.db"
    database_url = f"sqlite:///{database_path}"
    config = build_alembic_config(database_url)

    command.upgrade(config, "head")
    command.stamp(config, "head")

    tables = inspect(create_engine(database_url)).get_table_names()
    assert "alembic_version" in tables
