from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api import rsvp
from app.models import Guest, Household, Wedding

LOOKUP_URL = "/api/rsvp/lookup"


@pytest.fixture(autouse=True)
def fresh_rate_limit() -> Generator[None, None, None]:
    """Every test starts with a clean window, so lookups in one test never throttle another."""
    rsvp.lookup_rate_limit.reset()
    yield
    rsvp.lookup_rate_limit.reset()


def a_family(db_session: Session, wedding: Wedding) -> Household:
    family = Household(wedding_id=wedding.id, name="Famiglia Rossi")
    db_session.add_all(
        [
            Guest(
                wedding_id=wedding.id,
                first_name="Maria",
                last_name="Rossi",
                household=family,
                phone="+39 333 1234567",
                email="maria@example.com",
            ),
            Guest(wedding_id=wedding.id, first_name="Paolo", last_name="Rossi", household=family),
        ]
    )
    db_session.commit()
    return family


def lookup(client: TestClient, first_name: str, last_name: str):
    return client.post(LOOKUP_URL, json={"first_name": first_name, "last_name": last_name})


def test_given_a_guest_in_a_household_when_they_look_themselves_up_then_their_household_is_found_with_names_only(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)

    response = lookup(client, "Maria", "Rossi")

    assert response.status_code == 200
    assert response.json() == {
        "households": [
            {
                "token": family.rsvp_token,
                "name": "Famiglia Rossi",
                "members": [
                    {"first_name": "Maria", "last_name": "Rossi"},
                    {"first_name": "Paolo", "last_name": "Rossi"},
                ],
            }
        ]
    }


def test_given_a_guest_invited_alone_when_they_look_themselves_up_then_their_household_of_one_is_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    carlos = Guest(wedding_id=wedding.id, first_name="Carlos", last_name="Mendoza")
    db_session.add(carlos)
    db_session.commit()

    response = lookup(client, "Carlos", "Mendoza")

    households = response.json()["households"]
    assert [household["token"] for household in households] == [carlos.household.rsvp_token]
    assert households[0]["members"] == [{"first_name": "Carlos", "last_name": "Mendoza"}]


def test_given_a_name_typed_with_other_case_accents_and_spacing_when_looked_up_then_the_guest_is_still_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    jose = Guest(wedding_id=wedding.id, first_name="José Luis", last_name="Peña")
    db_session.add(jose)
    db_session.commit()

    response = lookup(client, "  jose   LUIS ", "PENA ")

    assert [household["token"] for household in response.json()["households"]] == [jose.household.rsvp_token]


def test_given_a_guest_with_two_last_names_when_they_type_only_one_then_they_are_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    ana = Guest(wedding_id=wedding.id, first_name="Ana", last_name="García López")
    db_session.add(ana)
    db_session.commit()

    by_first = lookup(client, "Ana", "Garcia")
    by_second = lookup(client, "Ana", "lopez")

    assert [household["token"] for household in by_first.json()["households"]] == [ana.household.rsvp_token]
    assert [household["token"] for household in by_second.json()["households"]] == [ana.household.rsvp_token]


def test_given_a_partial_name_when_looked_up_then_nobody_is_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_family(db_session, wedding)

    assert lookup(client, "Mar", "Rossi").json() == {"households": []}
    assert lookup(client, "Maria", "Ross").json() == {"households": []}
    assert lookup(client, "Paolo", "Bianchi").json() == {"households": []}


def test_given_two_guests_sharing_a_name_when_looked_up_then_both_households_are_offered(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)
    namesake = Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi")
    db_session.add(namesake)
    db_session.commit()

    response = lookup(client, "Maria", "Rossi")

    assert {household["token"] for household in response.json()["households"]} == {
        family.rsvp_token,
        namesake.household.rsvp_token,
    }


def test_given_a_blank_name_when_looked_up_then_it_is_rejected(client: TestClient, wedding: Wedding):
    assert lookup(client, "Maria", "   ").status_code == 422
    assert lookup(client, "", "Rossi").status_code == 422


def test_given_too_many_lookups_from_one_client_when_another_is_made_then_it_is_throttled(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_family(db_session, wedding)
    for _ in range(rsvp.LOOKUPS_PER_MINUTE):
        assert lookup(client, "Maria", "Rossi").status_code == 200

    response = lookup(client, "Maria", "Rossi")

    assert response.status_code == 429
    assert "Retry-After" in response.headers
