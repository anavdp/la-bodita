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


def lookup(client: TestClient, last_name: str):
    return client.post(LOOKUP_URL, json={"last_name": last_name})


def tokens(response) -> list[str]:
    return [household["token"] for household in response.json()["households"]]


def test_given_a_family_when_their_last_name_is_looked_up_then_their_household_is_found_with_names_only(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)

    response = lookup(client, "Rossi")

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


def test_given_a_guest_invited_alone_when_their_last_name_is_looked_up_then_their_household_of_one_is_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    carlos = Guest(wedding_id=wedding.id, first_name="Carlos", last_name="Mendoza")
    db_session.add(carlos)
    db_session.commit()

    response = lookup(client, "Mendoza")

    assert tokens(response) == [carlos.household.rsvp_token]
    assert response.json()["households"][0]["members"] == [{"first_name": "Carlos", "last_name": "Mendoza"}]


def test_given_a_last_name_typed_with_other_case_accents_and_spacing_when_looked_up_then_the_guest_is_still_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    jose = Guest(wedding_id=wedding.id, first_name="José", last_name="Peña Gómez")
    db_session.add(jose)
    db_session.commit()

    response = lookup(client, "  PENA   gomez ")

    assert tokens(response) == [jose.household.rsvp_token]


def test_given_a_compound_last_name_when_any_part_or_the_whole_is_typed_then_the_guest_is_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    gregorio = Guest(wedding_id=wedding.id, first_name="Gregorio", last_name="De Palma")
    db_session.add(gregorio)
    db_session.commit()

    for typed in ("Palma", "De Palma", "de palma aponte"):
        assert tokens(lookup(client, typed)) == [gregorio.household.rsvp_token], typed


def test_given_a_partial_word_or_a_bare_particle_when_looked_up_then_nobody_is_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_family(db_session, wedding)
    db_session.add(Guest(wedding_id=wedding.id, first_name="Gregorio", last_name="De Palma"))
    db_session.commit()

    assert lookup(client, "Ross").json() == {"households": []}
    assert lookup(client, "Bianchi").json() == {"households": []}
    # "de" alone would otherwise list every "De ..." family.
    assert lookup(client, "de").json() == {"households": []}


def test_given_several_households_sharing_a_last_name_when_looked_up_then_all_are_offered(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)
    cousin = Guest(wedding_id=wedding.id, first_name="Luca", last_name="Rossi")
    db_session.add(cousin)
    db_session.commit()

    response = lookup(client, "Rossi")

    assert set(tokens(response)) == {family.rsvp_token, cousin.household.rsvp_token}


def test_given_a_blank_or_one_letter_last_name_when_looked_up_then_it_is_rejected(client: TestClient, wedding: Wedding):
    assert lookup(client, "   ").status_code == 422
    assert lookup(client, " R ").status_code == 422


def test_given_too_many_lookups_from_one_client_when_another_is_made_then_it_is_throttled(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_family(db_session, wedding)
    for _ in range(rsvp.LOOKUPS_PER_MINUTE):
        assert lookup(client, "Rossi").status_code == 200

    response = lookup(client, "Rossi")

    assert response.status_code == 429
    assert "Retry-After" in response.headers
