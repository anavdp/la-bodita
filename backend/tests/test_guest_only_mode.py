"""The process the internet reaches runs with only the guest routes loaded.

Even if the proxy in front of it were misconfigured, the planner's API would not
exist on that process to be reached.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import Settings
from app.database import get_session
from app.main import create_app
from app.models import Guest, Household, Wedding


@pytest.fixture
def guest_only_client(db_session: Session) -> Generator[TestClient, None, None]:
    guest_only_app = create_app(guest_only=True)
    guest_only_app.dependency_overrides[get_session] = lambda: db_session
    with TestClient(guest_only_app) as test_client:
        yield test_client


def test_given_guest_only_mode_when_a_household_link_is_opened_then_the_invitation_is_served(
    guest_only_client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    db_session.add(Guest(wedding_id=wedding.id, first_name="Maria", last_name="Rossi", household=family))
    db_session.commit()

    response = guest_only_client.get(f"/api/rsvp/{family.rsvp_token}")

    assert response.status_code == 200
    assert response.json()["household_name"] == "Rossi"


@pytest.mark.parametrize(
    "planner_path",
    ["/api/weddings", "/api/weddings/1/guests", "/api/weddings/1/households", "/docs", "/openapi.json"],
)
def test_given_guest_only_mode_when_a_planner_route_is_requested_then_it_does_not_exist(
    guest_only_client: TestClient, wedding: Wedding, planner_path: str
):
    response = guest_only_client.get(planner_path)

    assert response.status_code == 404


def test_given_guest_only_mode_when_health_is_requested_then_it_still_reports_ok(guest_only_client: TestClient):
    response = guest_only_client.get("/health")

    assert response.status_code == 200


def test_given_the_full_app_when_the_planner_api_is_requested_then_it_is_served(client: TestClient, wedding: Wedding):
    response = client.get("/api/weddings")

    assert response.status_code == 200


def test_given_no_environment_override_when_settings_are_built_then_the_full_app_is_served(monkeypatch):
    monkeypatch.delenv("GUEST_ONLY", raising=False)

    assert Settings(_env_file=None).guest_only is False


def test_given_guest_only_in_the_environment_when_settings_are_built_then_it_is_on(monkeypatch):
    monkeypatch.setenv("GUEST_ONLY", "true")

    assert Settings(_env_file=None).guest_only is True
