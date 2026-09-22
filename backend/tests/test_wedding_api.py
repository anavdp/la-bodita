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
