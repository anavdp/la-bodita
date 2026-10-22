from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Wedding


def test_given_a_wedding_when_the_list_is_requested_then_it_is_returned(
    client: TestClient, wedding: Wedding
):
    """The UI needs the tenant root to know which wedding's guests to load."""
    response = client.get("/api/weddings")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": wedding.id,
            "name": "La Bodita",
            "wedding_date": "2026-10-29",
        }
    ]


def test_given_no_wedding_when_the_list_is_requested_then_it_is_empty(client: TestClient):
    response = client.get("/api/weddings")

    assert response.json() == []


def test_given_a_wedding_without_a_date_when_it_is_listed_then_the_date_is_null(
    client: TestClient, db_session: Session
):
    db_session.add(Wedding(name="Sin fecha todavia"))
    db_session.commit()

    response = client.get("/api/weddings")

    assert response.json()[0]["wedding_date"] is None


def test_given_a_wedding_when_its_name_and_date_are_changed_then_both_are_saved(
    client: TestClient, wedding: Wedding
):
    """Settings rename the wedding and move the date the sidebar counts down to."""
    response = client.patch(
        f"/api/weddings/{wedding.id}", json={"name": "  Vicky & Vitale  ", "wedding_date": "2027-05-15"}
    )

    assert response.status_code == 200
    assert response.json() == {"id": wedding.id, "name": "Vicky & Vitale", "wedding_date": "2027-05-15"}
    assert client.get("/api/weddings").json()[0]["wedding_date"] == "2027-05-15"


def test_given_a_wedding_when_only_the_date_is_cleared_then_the_name_stays(client: TestClient, wedding: Wedding):
    response = client.patch(f"/api/weddings/{wedding.id}", json={"wedding_date": None})

    assert response.status_code == 200
    assert response.json()["name"] == "La Bodita"
    assert response.json()["wedding_date"] is None


def test_given_a_wedding_when_its_name_is_blanked_then_it_is_refused(client: TestClient, wedding: Wedding):
    for blank in ("   ", None):
        response = client.patch(f"/api/weddings/{wedding.id}", json={"name": blank})

        assert response.status_code == 422
    assert client.get("/api/weddings").json()[0]["name"] == "La Bodita"


def test_given_no_such_wedding_when_it_is_changed_then_it_is_not_found(client: TestClient, wedding: Wedding):
    response = client.patch(f"/api/weddings/{wedding.id + 1}", json={"name": "Otra"})

    assert response.status_code == 404
