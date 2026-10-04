from datetime import datetime

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session

from app.models import Guest, Wedding
from app.models.guest import GuestGender, GuestRelationshipType, GuestSide, RsvpStatus


def build_guest(wedding: Wedding, **overrides) -> Guest:
    """The minimum a caller must supply, so each test states only what it varies."""
    fields = {
        "wedding_id": wedding.id,
        "first_name": "Maria",
        "last_name": "Rossi",
        "relationship_type": GuestRelationshipType.FAMILY,
        "side": GuestSide.ITALY,
    }
    return Guest(**{**fields, **overrides})


def test_given_a_guest_when_it_is_persisted_then_it_gets_an_id_and_timestamps(db_session: Session, wedding: Wedding):
    guest = build_guest(wedding)

    db_session.add(guest)
    db_session.commit()

    assert guest.id is not None
    assert guest.wedding_id == wedding.id
    assert isinstance(guest.created_at, datetime)
    assert isinstance(guest.updated_at, datetime)


def test_given_a_guest_when_optional_fields_are_omitted_then_they_default(db_session: Session, wedding: Wedding):
    guest = build_guest(wedding)

    db_session.add(guest)
    db_session.commit()

    assert guest.is_child is False
    assert guest.rsvp_status == RsvpStatus.PENDING
    assert guest.gender is None
    assert guest.phone is None
    assert guest.email is None


def test_given_a_guest_when_every_field_is_supplied_then_each_one_round_trips(db_session: Session, wedding: Wedding):
    guest = build_guest(
        wedding,
        first_name="Lucia",
        last_name="Mendoza",
        is_child=True,
        gender=GuestGender.FEMALE,
        relationship_type=GuestRelationshipType.FRIENDS,
        side=GuestSide.VENEZUELA,
        rsvp_status=RsvpStatus.DECLINED,
        phone="+58 412 555 0134",
        email="lucia@example.com",
    )

    db_session.add(guest)
    db_session.commit()
    db_session.expire_all()
    stored = db_session.get(Guest, guest.id)

    assert stored.first_name == "Lucia"
    assert stored.last_name == "Mendoza"
    assert stored.is_child is True
    assert stored.gender == GuestGender.FEMALE
    assert stored.relationship_type == GuestRelationshipType.FRIENDS
    assert stored.side == GuestSide.VENEZUELA
    assert stored.rsvp_status == RsvpStatus.DECLINED
    assert stored.phone == "+58 412 555 0134"
    assert stored.email == "lucia@example.com"


def test_given_an_enum_field_when_it_is_stored_then_the_lowercase_value_is_written(db_session: Session, wedding: Wedding):
    """The API and the UI speak the enum's value, so the column must hold it too."""
    guest = build_guest(wedding, side=GuestSide.VENEZUELA, rsvp_status=RsvpStatus.CONFIRMED)

    db_session.add(guest)
    db_session.commit()

    row = db_session.execute(
        text("select side, rsvp_status, relationship_type from guest where id = :id"),
        {"id": guest.id},
    ).one()
    assert row == ("venezuela", "confirmed", "family")


def test_given_a_guest_when_its_wedding_does_not_exist_then_the_insert_is_rejected(db_session: Session):
    orphan = Guest(
        wedding_id=404,
        first_name="Sin",
        last_name="Boda",
        relationship_type=GuestRelationshipType.OTHER,
        side=GuestSide.OTHER,
    )

    db_session.add(orphan)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_given_a_guest_when_its_wedding_is_deleted_then_the_guest_goes_with_it(db_session: Session, wedding: Wedding):
    guest = build_guest(wedding)
    db_session.add(guest)
    db_session.commit()

    db_session.delete(wedding)
    db_session.commit()

    assert db_session.execute(text("select count(*) from guest")).scalar_one() == 0


def test_given_an_unknown_rsvp_status_when_it_is_persisted_then_the_orm_rejects_it(
    db_session: Session, wedding: Wedding
):
    """The enum columns are plain text, so the ORM is what keeps the vocabulary closed."""
    guest = build_guest(wedding, rsvp_status="maybe")

    db_session.add(guest)

    with pytest.raises(StatementError) as rejection:
        db_session.commit()
    assert isinstance(rejection.value.orig, LookupError)


def test_given_the_guest_table_when_it_is_inspected_then_it_carries_only_this_slices_columns():
    columns = {column.name for column in Guest.__table__.columns}

    assert Guest.__tablename__ == "guest"
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


def test_given_the_guest_table_when_its_foreign_keys_are_inspected_then_they_point_at_wedding_and_household():
    """Guests hang off the tenant root and the household they are invited with."""
    foreign_keys = {
        constraint.name: constraint.referred_table.name
        for constraint in Guest.__table__.foreign_key_constraints
    }

    assert foreign_keys == {
        "fk_guest_wedding_id_wedding": "wedding",
        "fk_guest_household_id_household": "household",
    }


def test_given_the_guest_model_when_required_fields_are_inspected_then_only_the_optional_ones_are_nullable():
    columns = Guest.__table__.columns
    inspected = inspect(Guest)

    assert inspected.primary_key[0].name == "id"
    for required in ("household_id", "first_name", "last_name", "is_child", "rsvp_status"):
        assert columns[required].nullable is False, required
    for optional in ("gender", "relationship_type", "side", "phone", "email"):
        assert columns[optional].nullable is True, optional
