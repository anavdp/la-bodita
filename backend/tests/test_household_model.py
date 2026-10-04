import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Guest, Household, Wedding


def test_given_a_guest_added_without_a_household_when_it_is_saved_then_it_gets_a_household_of_one(
    db_session: Session, wedding: Wedding
):
    guest = Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi")

    db_session.add(guest)
    db_session.commit()

    assert guest.household_id is not None
    assert guest.household.wedding_id == wedding.id
    assert [member.id for member in guest.household.guests] == [guest.id]


def test_given_two_guests_added_alone_when_they_are_saved_then_each_has_its_own_household(
    db_session: Session, wedding: Wedding
):
    maria = Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi")
    carlos = Guest(wedding_id=wedding.id, first_name="Carlos", last_name="Mendoza")

    db_session.add_all([maria, carlos])
    db_session.commit()

    assert maria.household_id != carlos.household_id


def test_given_a_household_when_guests_join_it_then_they_share_it(db_session: Session, wedding: Wedding):
    household = Household(wedding_id=wedding.id, name="Rossi")
    db_session.add_all(
        [
            Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi", household=household),
            Guest(wedding_id=wedding.id, first_name="Paolo", last_name="Rossi", household=household),
        ]
    )
    db_session.commit()

    assert sorted(guest.first_name for guest in household.guests) == ["Maria", "Paolo"]
    assert db_session.scalars(select(Household)).all() == [household]


def test_given_a_new_household_when_it_is_saved_then_it_gets_a_long_private_rsvp_token(
    db_session: Session, wedding: Wedding
):
    first = Household(wedding_id=wedding.id)
    second = Household(wedding_id=wedding.id)
    db_session.add_all([first, second])
    db_session.commit()

    assert len(first.rsvp_token) >= 32
    assert first.rsvp_token != second.rsvp_token


def test_given_two_households_when_they_share_a_token_then_the_database_rejects_it(
    db_session: Session, wedding: Wedding
):
    db_session.add_all(
        [
            Household(wedding_id=wedding.id, rsvp_token="same"),
            Household(wedding_id=wedding.id, rsvp_token="same"),
        ]
    )

    with pytest.raises(IntegrityError):
        db_session.commit()
