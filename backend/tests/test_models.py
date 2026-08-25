from datetime import date, datetime

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, Session

from app.database import Base
from app.models import Wedding
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin


class ScopedRecordUnderTest(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """Stand-in for the per-entity tables that land with their own slices.

    Declared here rather than in `app` so the wedding-scoping conventions can be
    tested before the first real scoped table exists. Alembic autogenerate never
    sees it: it imports `app`, not `tests`.
    """

    __tablename__ = "scoped_record_under_test"

    title: Mapped[str]


def test_given_the_metadata_when_it_is_inspected_then_it_carries_the_alembic_naming_convention():
    convention = Base.metadata.naming_convention

    assert convention["pk"] == "pk_%(table_name)s"
    assert convention["fk"] == "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s"
    assert convention["ix"] == "ix_%(table_name)s_%(column_0_N_name)s"
    assert convention["uq"] == "uq_%(table_name)s_%(column_0_N_name)s"
    assert convention["ck"] == "ck_%(table_name)s_%(constraint_name)s"


def test_given_the_naming_convention_when_a_table_is_built_then_its_constraints_are_named():
    wedding_table = Wedding.__table__
    scoped_table = ScopedRecordUnderTest.__table__

    assert wedding_table.primary_key.name == "pk_wedding"
    foreign_key = next(iter(scoped_table.foreign_key_constraints))
    assert foreign_key.name == "fk_scoped_record_under_test_wedding_id_wedding"


def test_given_a_new_wedding_when_it_is_persisted_then_it_gets_an_id_and_timestamps(db_session: Session):
    wedding = Wedding(name="La Bodita", wedding_date=date(2026, 10, 29))

    db_session.add(wedding)
    db_session.commit()

    assert wedding.id is not None
    assert isinstance(wedding.created_at, datetime)
    assert isinstance(wedding.updated_at, datetime)


def test_given_a_wedding_when_its_date_is_omitted_then_it_is_still_valid(db_session: Session):
    wedding = Wedding(name="Sin fecha todavia")

    db_session.add(wedding)
    db_session.commit()

    assert wedding.wedding_date is None


def test_given_a_wedding_when_it_is_stored_then_the_tenant_root_table_is_named_wedding():
    assert Wedding.__tablename__ == "wedding"
    assert inspect(Wedding).primary_key[0].name == "id"


def test_given_a_scoped_record_when_it_belongs_to_a_wedding_then_it_persists(db_session: Session, wedding: Wedding):
    record = ScopedRecordUnderTest(title="Reservar la iglesia", wedding_id=wedding.id)

    db_session.add(record)
    db_session.commit()

    assert record.wedding_id == wedding.id


def test_given_a_scoped_record_when_its_wedding_does_not_exist_then_the_insert_is_rejected(db_session: Session):
    record = ScopedRecordUnderTest(title="Huerfano", wedding_id=404)

    db_session.add(record)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_given_a_scoped_record_when_the_column_is_inspected_then_it_is_required_and_indexed():
    wedding_id = ScopedRecordUnderTest.__table__.columns["wedding_id"]

    assert wedding_id.nullable is False
    assert wedding_id.index is True
