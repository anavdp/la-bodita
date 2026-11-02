"""A startup check that the database matches the code: at the latest migration,
with every table the models declare. Switching branches locally can leave the
database behind, and then a screen fails with `no such table` deep in the log;
this says so loudly, once, the moment the server starts."""

import logging
from pathlib import Path

from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from app.database import Base

logger = logging.getLogger("app.schema_check")

MIGRATIONS_DIRECTORY = Path(__file__).resolve().parent.parent / "alembic"
UPGRADE_HINT = "Run `alembic upgrade head` from backend/."


def model_table_names() -> set[str]:
    """Tables declared under `app`, so a test-only model never counts as missing."""
    return {
        mapper.local_table.name for mapper in Base.registry.mappers if mapper.class_.__module__.startswith("app.")
    }


def schema_problems(engine: Engine) -> list[str]:
    """What is out of step between the database and the code, in plain sentences."""
    expected_heads = set(ScriptDirectory(str(MIGRATIONS_DIRECTORY)).get_heads())
    with engine.connect() as connection:
        current_heads = set(MigrationContext.configure(connection).get_current_heads())
        existing_tables = set(inspect(connection).get_table_names())

    problems = []
    if not current_heads:
        problems.append(f"The database has had no migration run. {UPGRADE_HINT}")
    elif current_heads != expected_heads:
        problems.append(
            f"The database is at migration {', '.join(sorted(current_heads))}, "
            f"but the code expects {', '.join(sorted(expected_heads))}. {UPGRADE_HINT}"
        )
    missing_tables = sorted(model_table_names() - existing_tables)
    if missing_tables:
        problems.append(f"The database is missing tables: {', '.join(missing_tables)}. {UPGRADE_HINT}")
    return problems


def warn_if_schema_out_of_step(engine: Engine) -> None:
    """Never stops the server: a warning is the whole point."""
    try:
        problems = schema_problems(engine)
    except Exception:
        logger.warning("Could not check the database against the migrations.", exc_info=True)
        return
    for problem in problems:
        logger.warning("DATABASE OUT OF STEP: %s", problem)
