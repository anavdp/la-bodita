from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Guest, Household, Wedding

HOUSEHOLDS_URL = "/api/weddings/{wedding_id}/households"


def test_given_households_when_they_are_listed_then_each_comes_with_its_rsvp_token_and_members(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    db_session.add_all(
        [
            Guest(wedding_id=wedding.id, first_name="Paolo", last_name="Rossi", household=family),
            Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi", household=family),
            Guest(wedding_id=wedding.id, first_name="Carlos", last_name="Mendoza"),
        ]
    )
    db_session.commit()

    response = client.get(HOUSEHOLDS_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    households = response.json()
    assert len(households) == 2
    rossi = next(household for household in households if household["name"] == "Rossi")
    assert rossi["rsvp_token"] == family.rsvp_token
    assert rossi["guest_ids"] == [guest.id for guest in family.guests]
    alone = next(household for household in households if household["name"] == "Carlos Mendoza")
    assert len(alone["guest_ids"]) == 1


def test_given_another_weddings_households_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    db_session.add(Household(wedding_id=other_wedding.id, name="Ajena"))
    db_session.commit()

    response = client.get(HOUSEHOLDS_URL.format(wedding_id=wedding.id))

    assert response.json() == []


def test_given_an_unknown_wedding_when_households_are_listed_then_it_is_not_found(client: TestClient):
    response = client.get(HOUSEHOLDS_URL.format(wedding_id=404))

    assert response.status_code == 404


def a_guest(db_session: Session, wedding: Wedding, first_name: str, last_name: str = "Rossi", **fields) -> Guest:
    guest = Guest(wedding_id=wedding.id, first_name=first_name, last_name=last_name, **fields)
    db_session.add(guest)
    db_session.commit()
    return guest


def household_url(wedding: Wedding, household_id: int) -> str:
    return f"{HOUSEHOLDS_URL.format(wedding_id=wedding.id)}/{household_id}"


def all_household_ids(db_session: Session) -> set[int]:
    return set(db_session.scalars(select(Household.id)))


def test_given_guests_on_their_own_when_a_household_is_created_with_them_then_they_move_in_together(
    client: TestClient, db_session: Session, wedding: Wedding
):
    maria = a_guest(db_session, wedding, "Maria")
    paolo = a_guest(db_session, wedding, "Paolo")
    old_households = {maria.household_id, paolo.household_id}

    response = client.post(
        HOUSEHOLDS_URL.format(wedding_id=wedding.id),
        json={"name": "Famiglia Rossi", "guest_ids": [maria.id, paolo.id]},
    )

    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Famiglia Rossi"
    assert sorted(created["guest_ids"]) == sorted([maria.id, paolo.id])
    assert len(created["rsvp_token"]) >= 32
    assert all_household_ids(db_session) == {created["id"]}
    assert old_households.isdisjoint(all_household_ids(db_session))


def test_given_a_family_when_one_member_is_taken_into_a_new_household_then_the_family_keeps_the_rest(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    maria = a_guest(db_session, wedding, "Maria", household=family)
    a_guest(db_session, wedding, "Paolo", household=family)

    response = client.post(
        HOUSEHOLDS_URL.format(wedding_id=wedding.id), json={"name": "Maria & co", "guest_ids": [maria.id]}
    )

    assert response.status_code == 201
    assert family.id in all_household_ids(db_session)
    assert len(all_household_ids(db_session)) == 2


def test_given_a_blank_name_when_a_household_is_created_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    maria = a_guest(db_session, wedding, "Maria")

    response = client.post(
        HOUSEHOLDS_URL.format(wedding_id=wedding.id), json={"name": "  ", "guest_ids": [maria.id]}
    )

    assert response.status_code == 422


def test_given_no_guests_when_a_household_is_created_then_it_is_rejected(client: TestClient, wedding: Wedding):
    response = client.post(HOUSEHOLDS_URL.format(wedding_id=wedding.id), json={"name": "Vacía", "guest_ids": []})

    assert response.status_code == 422


def test_given_another_weddings_guest_when_a_household_is_created_with_them_then_nothing_changes(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    stranger = a_guest(db_session, other_wedding, "Ajeno")
    before = all_household_ids(db_session)

    response = client.post(
        HOUSEHOLDS_URL.format(wedding_id=wedding.id), json={"name": "Robo", "guest_ids": [stranger.id]}
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Guest not found"
    assert all_household_ids(db_session) == before


def test_given_a_household_when_it_is_renamed_then_only_its_name_changes(
    client: TestClient, db_session: Session, wedding: Wedding
):
    maria = a_guest(db_session, wedding, "Maria")
    token = maria.household.rsvp_token

    response = client.patch(household_url(wedding, maria.household_id), json={"name": "Famiglia Rossi"})

    assert response.status_code == 200
    assert response.json()["name"] == "Famiglia Rossi"
    assert response.json()["rsvp_token"] == token
    assert response.json()["guest_ids"] == [maria.id]


def test_given_a_household_when_its_members_are_set_then_newcomers_move_in_and_the_rest_split_off(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    maria = a_guest(db_session, wedding, "Maria", household=family)
    paolo = a_guest(db_session, wedding, "Paolo", household=family)
    giulia = a_guest(db_session, wedding, "Giulia")
    giulias_old_household = giulia.household_id

    response = client.patch(household_url(wedding, family.id), json={"guest_ids": [maria.id, giulia.id]})

    assert response.status_code == 200
    assert sorted(response.json()["guest_ids"]) == sorted([maria.id, giulia.id])
    assert giulias_old_household not in all_household_ids(db_session)
    db_session.refresh(paolo)
    assert paolo.household_id != family.id
    assert paolo.household.name == "Paolo Rossi"


def test_given_a_household_when_it_is_left_with_no_members_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    maria = a_guest(db_session, wedding, "Maria")

    response = client.patch(household_url(wedding, maria.household_id), json={"guest_ids": []})

    assert response.status_code == 422


def test_given_another_weddings_household_when_it_is_edited_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    stranger = a_guest(db_session, other_wedding, "Ajeno")

    response = client.patch(household_url(wedding, stranger.household_id), json={"name": "Mía"})

    assert response.status_code == 404


def test_given_a_family_when_it_is_deleted_with_its_guests_then_they_are_all_gone(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    a_guest(db_session, wedding, "Maria", household=family)
    a_guest(db_session, wedding, "Paolo", household=family)
    carlos = a_guest(db_session, wedding, "Carlos", "Mendoza")

    response = client.delete(f"{household_url(wedding, family.id)}?delete_guests=true")

    assert response.status_code == 204
    assert [guest.id for guest in db_session.scalars(select(Guest))] == [carlos.id]
    assert all_household_ids(db_session) == {carlos.household_id}


def test_given_a_family_when_it_is_deleted_but_its_guests_kept_then_each_is_left_on_their_own(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    maria = a_guest(db_session, wedding, "Maria", household=family)
    paolo = a_guest(db_session, wedding, "Paolo", household=family)

    response = client.delete(household_url(wedding, family.id))

    assert response.status_code == 204
    db_session.refresh(maria)
    db_session.refresh(paolo)
    assert family.id not in all_household_ids(db_session)
    assert maria.household_id != paolo.household_id
    assert (maria.household.name, paolo.household.name) == ("Maria Rossi", "Paolo Rossi")


def test_given_an_unknown_household_when_it_is_deleted_then_it_is_not_found(client: TestClient, wedding: Wedding):
    response = client.delete(household_url(wedding, 404))

    assert response.status_code == 404
