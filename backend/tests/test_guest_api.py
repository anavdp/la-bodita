from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Guest, Wedding

GUESTS_URL = "/api/weddings/{wedding_id}/guests"


def a_guest(**overrides) -> dict:
    """A valid create payload; each test overrides only the field it is about."""
    return {
        "first_name": "Maria",
        "last_name": "Rossi",
        "relationship_type": "family",
        "side": "italy",
        **overrides,
    }


def add_guest(db_session: Session, wedding: Wedding, **overrides) -> Guest:
    guest = Guest(wedding_id=wedding.id, **a_guest(**overrides))
    db_session.add(guest)
    db_session.commit()
    return guest


def test_given_a_valid_payload_when_a_guest_is_created_then_it_is_returned_with_its_defaults(
    client: TestClient, wedding: Wedding
):
    response = client.post(GUESTS_URL.format(wedding_id=wedding.id), json=a_guest())

    assert response.status_code == 201
    created = response.json()
    assert created["id"] > 0
    assert created["wedding_id"] == wedding.id
    assert created["first_name"] == "Maria"
    assert created["is_child"] is False
    assert created["rsvp_status"] == "pending"
    assert created["gender"] is None
    assert created["phone"] is None
    assert created["email"] is None


def test_given_a_full_payload_when_a_guest_is_created_then_every_field_is_stored(
    client: TestClient, wedding: Wedding
):
    payload = a_guest(
        first_name="Lucia",
        last_name="Mendoza",
        is_child=True,
        gender="female",
        relationship_type="friends",
        side="venezuela",
        rsvp_status="confirmed",
        phone="+58 412 555 0134",
        email="lucia@example.com",
    )

    response = client.post(GUESTS_URL.format(wedding_id=wedding.id), json=payload)

    assert response.status_code == 201
    assert {key: response.json()[key] for key in payload} == payload


def test_given_an_unknown_wedding_when_a_guest_is_created_then_it_is_rejected_as_not_found(
    client: TestClient,
):
    response = client.post(GUESTS_URL.format(wedding_id=404), json=a_guest())

    assert response.status_code == 404
    assert response.json()["detail"] == "Wedding not found"


def test_given_a_value_outside_the_vocabulary_when_a_guest_is_created_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = client.post(GUESTS_URL.format(wedding_id=wedding.id), json=a_guest(side="france"))

    assert response.status_code == 422


def test_given_a_blank_name_when_a_guest_is_created_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = client.post(GUESTS_URL.format(wedding_id=wedding.id), json=a_guest(first_name="  "))

    assert response.status_code == 422


def test_given_guests_of_this_wedding_when_the_list_is_requested_then_they_come_back_sorted_by_name(
    client: TestClient, db_session: Session, wedding: Wedding
):
    add_guest(db_session, wedding, first_name="Carlos", last_name="Mendoza")
    add_guest(db_session, wedding, first_name="Alejandro", last_name="Garcia")
    add_guest(db_session, wedding, first_name="Lucia", last_name="Mendoza")

    response = client.get(GUESTS_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    assert [(guest["last_name"], guest["first_name"]) for guest in response.json()] == [
        ("Garcia", "Alejandro"),
        ("Mendoza", "Carlos"),
        ("Mendoza", "Lucia"),
    ]


def test_given_another_weddings_guests_when_the_list_is_requested_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    add_guest(db_session, wedding, first_name="Nuestra")
    add_guest(db_session, other_wedding, first_name="Ajena")

    response = client.get(GUESTS_URL.format(wedding_id=wedding.id))

    assert [guest["first_name"] for guest in response.json()] == ["Nuestra"]


def test_given_a_wedding_without_guests_when_the_list_is_requested_then_it_is_empty(
    client: TestClient, wedding: Wedding
):
    response = client.get(GUESTS_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    assert response.json() == []


def test_given_an_unknown_wedding_when_the_list_is_requested_then_it_is_not_found(client: TestClient):
    response = client.get(GUESTS_URL.format(wedding_id=404))

    assert response.status_code == 404


def test_given_an_existing_guest_when_it_is_requested_then_it_is_returned(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding)

    response = client.get(f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}")

    assert response.status_code == 200
    assert response.json()["id"] == guest.id


def test_given_an_unknown_guest_when_it_is_requested_then_it_is_not_found(
    client: TestClient, wedding: Wedding
):
    response = client.get(f"{GUESTS_URL.format(wedding_id=wedding.id)}/404")

    assert response.status_code == 404
    assert response.json()["detail"] == "Guest not found"


def test_given_a_guest_of_another_wedding_when_it_is_requested_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    """Tenant scoping: an id from another wedding must not be reachable through this one."""
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    stranger = add_guest(db_session, other_wedding)

    response = client.get(f"{GUESTS_URL.format(wedding_id=wedding.id)}/{stranger.id}")

    assert response.status_code == 404


def test_given_an_rsvp_reply_when_the_guest_is_patched_then_only_that_field_changes(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding, first_name="Carlos", last_name="Mendoza")

    response = client.patch(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}",
        json={"rsvp_status": "confirmed"},
    )

    assert response.status_code == 200
    updated = response.json()
    assert updated["rsvp_status"] == "confirmed"
    assert updated["first_name"] == "Carlos"
    assert updated["last_name"] == "Mendoza"


def test_given_an_optional_field_when_it_is_patched_to_null_then_it_is_cleared(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding, phone="+39 333 555 0100")

    response = client.patch(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}", json={"phone": None}
    )

    assert response.status_code == 200
    assert response.json()["phone"] is None


def test_given_an_empty_patch_when_it_is_applied_then_the_guest_is_unchanged(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding, first_name="Maria")

    response = client.patch(f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}", json={})

    assert response.status_code == 200
    assert response.json()["first_name"] == "Maria"


def test_given_a_value_outside_the_vocabulary_when_a_guest_is_patched_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding)

    response = client.patch(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}", json={"rsvp_status": "maybe"}
    )

    assert response.status_code == 422


def test_given_an_unknown_guest_when_it_is_patched_then_it_is_not_found(
    client: TestClient, wedding: Wedding
):
    response = client.patch(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/404", json={"rsvp_status": "confirmed"}
    )

    assert response.status_code == 404


def test_given_an_existing_guest_when_it_is_deleted_then_it_is_gone(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding)

    response = client.delete(f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}")

    assert response.status_code == 204
    assert client.get(f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}").status_code == 404


def test_given_an_unknown_guest_when_it_is_deleted_then_it_is_not_found(
    client: TestClient, wedding: Wedding
):
    response = client.delete(f"{GUESTS_URL.format(wedding_id=wedding.id)}/404")

    assert response.status_code == 404


def test_given_a_required_field_when_it_is_patched_to_null_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    """`phone: null` means "clear it"; `first_name: null` is not a thing a guest can be."""
    guest = add_guest(db_session, wedding)

    response = client.patch(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}", json={"first_name": None}
    )

    assert response.status_code == 422


def test_given_no_relationship_or_side_when_a_guest_is_created_then_both_are_left_empty(
    client: TestClient, wedding: Wedding
):
    """A name is all a guest needs up front; how they are related can come later."""
    response = client.post(
        GUESTS_URL.format(wedding_id=wedding.id),
        json={"first_name": "Maria", "last_name": "Rossi"},
    )

    assert response.status_code == 201
    assert response.json()["relationship_type"] is None
    assert response.json()["side"] is None


def test_given_a_relationship_and_side_when_they_are_patched_to_null_then_both_are_cleared(
    client: TestClient, db_session: Session, wedding: Wedding
):
    guest = add_guest(db_session, wedding)

    response = client.patch(
        f"{GUESTS_URL.format(wedding_id=wedding.id)}/{guest.id}",
        json={"relationship_type": None, "side": None},
    )

    assert response.status_code == 200
    assert response.json()["relationship_type"] is None
    assert response.json()["side"] is None
