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


def test_given_an_empty_database_when_migrations_run_then_the_guest_table_exists(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'guest_schema_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    inspector = inspect(create_engine(database_url))
    assert "guest" in inspector.get_table_names()
    columns = {column["name"] for column in inspector.get_columns("guest")}
    assert columns == {
        "id",
        "wedding_id",
        "household_id",
        "first_name",
        "last_name",
        "is_child",
        "gender",
        "relationship_type",
        "side",
        "rsvp_status",
        "phone",
        "email",
        "created_at",
        "updated_at",
    }


def test_given_the_guest_migration_when_it_runs_then_the_wedding_foreign_key_is_named_and_indexed(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'guest_constraint_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    inspector = inspect(create_engine(database_url))
    foreign_keys = {key["name"]: key["referred_table"] for key in inspector.get_foreign_keys("guest")}
    assert foreign_keys["fk_guest_wedding_id_wedding"] == "wedding"
    indexed_columns = [index["column_names"] for index in inspector.get_indexes("guest")]
    assert ["wedding_id"] in indexed_columns


def test_given_the_guest_migration_when_the_enum_columns_land_then_they_are_plain_text(tmp_path):
    """No CHECK constraint: adding a side later must stay a code change, not a table rebuild."""
    database_url = f"sqlite:///{tmp_path / 'guest_enum_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    with create_engine(database_url).connect() as connection:
        create_statement = connection.exec_driver_sql(
            "select sql from sqlite_master where name = 'guest'"
        ).scalar_one()
    assert "CHECK" not in create_statement.upper()
    assert "rsvp_status VARCHAR(20)" in create_statement


def test_given_the_guest_migration_when_it_is_downgraded_then_only_the_guest_table_is_dropped(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'guest_downgrade_check.db'}"
    config = build_alembic_config(database_url)
    command.upgrade(config, "head")

    command.downgrade(config, "1fea8ee535b2")

    tables = inspect(create_engine(database_url)).get_table_names()
    assert "guest" not in tables
    assert "wedding" in tables


def guest_column_nullability(database_url: str) -> dict[str, bool]:
    columns = inspect(create_engine(database_url)).get_columns("guest")
    return {column["name"]: column["nullable"] for column in columns}


def test_given_migrations_at_head_when_the_guest_table_is_inspected_then_relationship_and_side_are_optional(
    tmp_path,
):
    database_url = f"sqlite:///{tmp_path / 'guest_optional_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    nullability = guest_column_nullability(database_url)
    assert nullability["relationship_type"] is True
    assert nullability["side"] is True
    assert nullability["first_name"] is False


def test_given_optional_relationship_and_side_when_the_migration_is_downgraded_then_they_are_required_again(
    tmp_path,
):
    database_url = f"sqlite:///{tmp_path / 'guest_optional_downgrade_check.db'}"
    config = build_alembic_config(database_url)
    command.upgrade(config, "head")

    command.downgrade(config, "1c9790e79368")

    nullability = guest_column_nullability(database_url)
    assert nullability["relationship_type"] is False
    assert nullability["side"] is False


def test_given_guests_without_relationship_or_side_when_the_migration_is_downgraded_then_they_fall_back_to_other(
    tmp_path,
):
    database_url = f"sqlite:///{tmp_path / 'guest_optional_backfill_check.db'}"
    config = build_alembic_config(database_url)
    command.upgrade(config, "5b3e7d2a9c41")
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.exec_driver_sql("insert into wedding (id, name) values (1, 'La Bodita')")
        connection.exec_driver_sql(
            "insert into guest (wedding_id, first_name, last_name) values (1, 'Maria', 'Rossi')"
        )

    command.downgrade(config, "1c9790e79368")

    with engine.connect() as connection:
        row = connection.exec_driver_sql("select relationship_type, side from guest").one()
    assert tuple(row) == ("other", "other")


def test_given_an_empty_database_when_migrations_run_then_the_household_table_exists(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'household_schema_check.db'}"

    command.upgrade(build_alembic_config(database_url), "head")

    inspector = inspect(create_engine(database_url))
    columns = {column["name"] for column in inspector.get_columns("household")}
    assert columns == {"id", "wedding_id", "name", "rsvp_token", "created_at", "updated_at"}
    guest_foreign_keys = {key["name"]: key["referred_table"] for key in inspector.get_foreign_keys("guest")}
    assert guest_foreign_keys["fk_guest_household_id_household"] == "household"
    assert guest_column_nullability(database_url)["household_id"] is False


def test_given_existing_guests_when_the_household_migration_runs_then_each_gets_a_household_of_one(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'household_backfill_check.db'}"
    config = build_alembic_config(database_url)
    command.upgrade(config, "5b3e7d2a9c41")
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.exec_driver_sql("insert into wedding (id, name) values (1, 'La Bodita')")
        connection.exec_driver_sql(
            "insert into guest (wedding_id, first_name, last_name) values"
            " (1, 'Maria', 'Rossi'), (1, 'Carlos', 'Mendoza')"
        )

    command.upgrade(config, "head")

    with engine.connect() as connection:
        guest_households = connection.exec_driver_sql("select household_id from guest").scalars().all()
        households = connection.exec_driver_sql("select wedding_id, rsvp_token from household").all()
    assert len(set(guest_households)) == 2
    assert len(households) == 2
    assert all(wedding_id == 1 for wedding_id, _ in households)
    assert len({token for _, token in households}) == 2
    assert all(len(token) >= 32 for _, token in households)


def test_given_the_household_migration_when_it_is_downgraded_then_guests_survive_without_households(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'household_downgrade_check.db'}"
    config = build_alembic_config(database_url)
    command.upgrade(config, "head")
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.exec_driver_sql("insert into wedding (id, name) values (1, 'La Bodita')")
        connection.exec_driver_sql("insert into household (id, wedding_id, rsvp_token) values (1, 1, 'abc')")
        connection.exec_driver_sql(
            "insert into guest (wedding_id, household_id, first_name, last_name) values (1, 1, 'Maria', 'Rossi')"
        )

    command.downgrade(config, "5b3e7d2a9c41")

    inspector = inspect(engine)
    assert "household" not in inspector.get_table_names()
    assert "household_id" not in guest_column_nullability(database_url)
    with engine.connect() as connection:
        assert connection.exec_driver_sql("select count(*) from guest").scalar_one() == 1
