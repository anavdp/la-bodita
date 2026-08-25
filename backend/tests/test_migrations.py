from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect

from app.database import Base

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


def test_given_an_empty_database_when_migrations_run_then_the_wedding_tenant_root_exists(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'schema_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    inspector = inspect(create_engine(database_url))
    assert "wedding" in inspector.get_table_names()
    columns = {column["name"] for column in inspector.get_columns("wedding")}
    assert columns == {"id", "name", "wedding_date", "created_at", "updated_at"}


def test_given_migrations_at_head_when_the_naming_convention_applies_then_the_primary_key_is_named(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'naming_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    inspector = inspect(create_engine(database_url))
    assert inspector.get_pk_constraint("wedding")["name"] == "pk_wedding"


def test_given_migrations_at_head_when_they_are_downgraded_then_the_schema_is_torn_back_down(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'downgrade_check.db'}"
    config = build_alembic_config(database_url)
    command.upgrade(config, "head")

    command.downgrade(config, "base")

    assert "wedding" not in inspect(create_engine(database_url)).get_table_names()


def application_table_names() -> set[str]:
    """Tables declared under `app`, so test-only models don't count as drift."""
    return {
        mapper.local_table.name
        for mapper in Base.registry.mappers
        if mapper.class_.__module__.startswith("app.")
    }


def test_given_migrations_at_head_when_compared_to_the_models_then_nothing_has_drifted(tmp_path):
    """Guards the slice-by-slice schema: every slice must ship its own migration."""
    database_url = f"sqlite:///{tmp_path / 'drift_check.db'}"
    command.upgrade(build_alembic_config(database_url), "head")
    application_tables = application_table_names()

    def only_application_tables(obj, name, object_type, reflected, compare_to):
        return object_type != "table" or name in application_tables

    with create_engine(database_url).connect() as connection:
        context = MigrationContext.configure(
            connection, opts={"include_object": only_application_tables}
        )
        differences = compare_metadata(context, Base.metadata)

    assert differences == []
