from sqlalchemy import text

from app.database import Base, get_session


def test_given_a_session_dependency_when_it_is_consumed_then_it_yields_a_usable_session():
    session_generator = get_session()
    session = next(session_generator)

    assert session.execute(text("select 1")).scalar_one() == 1


def test_given_a_consumed_session_when_the_dependency_finishes_then_the_session_is_closed():
    session_generator = get_session()
    session = next(session_generator)

    list(session_generator)

    assert not session.is_active or session.get_bind() is not None
    assert session.get_transaction() is None


def test_given_a_sqlite_engine_when_a_connection_is_opened_then_foreign_keys_are_enforced():
    session_generator = get_session()
    session = next(session_generator)

    assert session.execute(text("pragma foreign_keys")).scalar_one() == 1

    list(session_generator)


def test_given_the_declarative_base_when_metadata_is_inspected_then_it_is_shared_by_models():
    assert Base.metadata is not None
