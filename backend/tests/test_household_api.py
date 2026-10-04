from fastapi.testclient import TestClient
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
    alone = next(household for household in households if household["name"] is None)
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
