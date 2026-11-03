from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Guest, Household, HouseholdRoom, RoomType, Wedding

ROOM_TYPES_URL = "/api/weddings/{wedding_id}/room-types"


def a_room_type(db_session: Session, wedding: Wedding, name: str = "Junior King", **fields) -> RoomType:
    room_type = RoomType(wedding_id=wedding.id, name=name, **{"available": 19, **fields})
    db_session.add(room_type)
    db_session.commit()
    return room_type


def room_type_url(wedding: Wedding, room_type: RoomType) -> str:
    return f"{ROOM_TYPES_URL.format(wedding_id=wedding.id)}/{room_type.id}"


def test_given_room_types_when_they_are_listed_then_they_come_in_the_order_they_were_added(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_room_type(db_session, wedding, "Junior King", beds="1 king bed")
    a_room_type(db_session, wedding, "Doble", available=10)

    response = client.get(ROOM_TYPES_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    assert [(each["name"], each["beds"], each["available"]) for each in response.json()] == [
        ("Junior King", "1 king bed", 19),
        ("Doble", None, 10),
    ]


def test_given_another_weddings_room_types_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other = Wedding(name="Otra boda")
    db_session.add(other)
    db_session.commit()
    a_room_type(db_session, other)

    assert client.get(ROOM_TYPES_URL.format(wedding_id=wedding.id)).json() == []


def test_given_a_name_and_how_many_the_hotel_has_when_a_room_type_is_added_then_it_is_kept(
    client: TestClient, wedding: Wedding
):
    response = client.post(
        ROOM_TYPES_URL.format(wedding_id=wedding.id),
        json={"name": " Suite for 5 ", "beds": "1 double + 3 single", "available": 1},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Suite for 5"
    assert response.json()["available"] == 1


def test_given_a_negative_number_of_rooms_when_a_room_type_is_added_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = client.post(ROOM_TYPES_URL.format(wedding_id=wedding.id), json={"name": "Doble", "available": -1})

    assert response.status_code == 422


def test_given_a_room_type_when_the_hotel_has_more_then_only_that_changes(
    client: TestClient, db_session: Session, wedding: Wedding
):
    room_type = a_room_type(db_session, wedding, beds="1 king bed")

    response = client.patch(room_type_url(wedding, room_type), json={"available": 20})

    assert response.json()["available"] == 20
    assert response.json()["name"] == "Junior King"
    assert response.json()["beds"] == "1 king bed"


def test_given_another_weddings_room_type_when_it_is_changed_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other = Wedding(name="Otra boda")
    db_session.add(other)
    db_session.commit()
    room_type = a_room_type(db_session, other)

    response = client.patch(room_type_url(wedding, room_type), json={"available": 3})

    assert response.status_code == 404


def test_given_a_room_type_nobody_has_when_it_is_deleted_then_it_is_gone(
    client: TestClient, db_session: Session, wedding: Wedding
):
    room_type = a_room_type(db_session, wedding)

    response = client.delete(room_type_url(wedding, room_type))

    assert response.status_code == 204
    assert client.get(ROOM_TYPES_URL.format(wedding_id=wedding.id)).json() == []


def test_given_a_room_type_booked_for_a_household_when_it_is_deleted_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding
):
    room_type = a_room_type(db_session, wedding)
    guest = Guest(wedding_id=wedding.id, first_name="Ana", last_name="Mendoza")
    db_session.add(guest)
    db_session.commit()
    db_session.add(HouseholdRoom(wedding_id=wedding.id, household_id=guest.household_id, room_type_id=room_type.id, count=1))
    db_session.commit()

    response = client.delete(room_type_url(wedding, room_type))

    assert response.status_code == 409
    assert db_session.get(RoomType, room_type.id) is not None
    assert isinstance(db_session.get(Household, guest.household_id), Household)
