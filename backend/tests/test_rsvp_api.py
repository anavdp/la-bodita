from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Guest, Household, Wedding
from app.models.guest import RsvpStatus

RSVP_URL = "/api/rsvp/{token}"


def a_family(db_session: Session, wedding: Wedding) -> Household:
    family = Household(wedding_id=wedding.id, name="Rossi")
    db_session.add_all(
        [
            Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi", household=family),
            Guest(wedding_id=wedding.id, first_name="Paolo", last_name="Rossi", household=family),
        ]
    )
    db_session.commit()
    return family


def test_given_a_household_link_when_it_is_opened_then_every_member_is_listed_with_their_answer(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)

    response = client.get(RSVP_URL.format(token=family.rsvp_token))

    assert response.status_code == 200
    body = response.json()
    assert body["household_name"] == "Rossi"
    assert body["wedding_name"] == "La Bodita"
    assert body["wedding_date"] == "2026-10-29"
    assert [(guest["first_name"], guest["rsvp_status"]) for guest in body["guests"]] == [
        ("Maria", "pending"),
        ("Paolo", "pending"),
    ]


def test_given_an_unknown_link_when_it_is_opened_then_it_is_not_found(client: TestClient, wedding: Wedding):
    response = client.get(RSVP_URL.format(token="not-a-real-token"))

    assert response.status_code == 404


def test_given_a_household_when_it_answers_then_each_member_gets_their_own_yes_or_no(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)
    maria, paolo = family.guests

    response = client.put(
        RSVP_URL.format(token=family.rsvp_token),
        json={
            "answers": [
                {"guest_id": maria.id, "attending": True},
                {"guest_id": paolo.id, "attending": False},
            ]
        },
    )

    assert response.status_code == 200
    assert [guest["rsvp_status"] for guest in response.json()["guests"]] == ["confirmed", "declined"]
    db_session.refresh(maria)
    db_session.refresh(paolo)
    assert maria.rsvp_status == RsvpStatus.CONFIRMED
    assert paolo.rsvp_status == RsvpStatus.DECLINED


def test_given_an_answer_for_someone_outside_the_household_when_it_is_sent_then_nothing_is_saved(
    client: TestClient, db_session: Session, wedding: Wedding
):
    family = a_family(db_session, wedding)
    stranger = Guest(wedding_id=wedding.id, first_name="Carlos", last_name="Mendoza")
    db_session.add(stranger)
    db_session.commit()
    maria = family.guests[0]

    response = client.put(
        RSVP_URL.format(token=family.rsvp_token),
        json={
            "answers": [
                {"guest_id": maria.id, "attending": True},
                {"guest_id": stranger.id, "attending": True},
            ]
        },
    )

    assert response.status_code == 422
    db_session.refresh(maria)
    db_session.refresh(stranger)
    assert maria.rsvp_status == RsvpStatus.PENDING
    assert stranger.rsvp_status == RsvpStatus.PENDING


def test_given_an_unknown_link_when_answers_are_sent_then_it_is_not_found(client: TestClient, wedding: Wedding):
    response = client.put(
        RSVP_URL.format(token="not-a-real-token"), json={"answers": [{"guest_id": 1, "attending": True}]}
    )

    assert response.status_code == 404
