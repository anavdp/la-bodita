"""The planner's own sign-in: Google proves who someone is, and only the two
accounts on the wedding's list get a session.

Every planner route answers 401 without one, so the API is closed even with
nothing in front of it. The guests' RSVP routes stay open.
"""

import base64
import json
import re
from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import SESSION_COOKIE, hash_token, start_session
from app.config import settings
from app.database import get_session
from app.google_sign_in import GoogleSignIn, get_google_sign_in
from app.main import app
from app.models import Household, UserAccount, UserSession, Wedding

PLANNER_URL = "https://planner.example.com"
CLIENT_ID = "client-123.apps.googleusercontent.com"


def encode(part: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(part).encode()).decode().rstrip("=")


def google_id_token(**overrides) -> str:
    """An ID token as Google's token endpoint returns it, for the claims under test."""
    claims = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()),
        "email": "vicky@example.com",
        "email_verified": True,
        "nonce": "the-nonce",
        "name": "Vicky D",
    }
    claims.update(overrides)
    return f"{encode({'alg': 'RS256'})}.{encode(claims)}.signature"


class FakeGoogle(GoogleSignIn):
    """Google, with its token endpoint answering every code with the token it was given."""

    def __init__(self) -> None:
        super().__init__(CLIENT_ID, "secret", f"{PLANNER_URL}/api/auth/google/callback")
        self.id_token = google_id_token()
        self.exchanged: list[tuple[str, str]] = []

    def exchange(self, code: str, code_verifier: str) -> str:
        self.exchanged.append((code, code_verifier))
        return self.id_token


@pytest.fixture(autouse=True)
def google_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(settings, "google_client_secret", "secret")
    monkeypatch.setattr(settings, "planner_url", PLANNER_URL)
    monkeypatch.setattr(settings, "api_url", PLANNER_URL)


@pytest.fixture
def google() -> FakeGoogle:
    return FakeGoogle()


@pytest.fixture
def anonymous_client(db_session: Session, google: FakeGoogle) -> Generator[TestClient, None, None]:
    """The API as a browser meets it: no sign-in stood in for."""
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_google_sign_in] = lambda: google
    with TestClient(app, base_url=PLANNER_URL, follow_redirects=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def vicky(db_session: Session, wedding: Wedding) -> UserAccount:
    account = UserAccount(wedding_id=wedding.id, email="vicky@example.com", display_name="Vicky")
    db_session.add(account)
    db_session.commit()
    return account


def sign_in(client: TestClient, db_session: Session, account: UserAccount) -> str:
    token = start_session(db_session, account)
    client.cookies.set(SESSION_COOKIE, token)
    return token


def planner_routes() -> list[tuple[str, str]]:
    """Every planner route the app serves, read off its API description, with path ids filled in."""
    routes = []
    for path, operations in app.openapi()["paths"].items():
        if not path.startswith("/api/") or path.startswith(("/api/rsvp", "/api/auth")):
            continue
        filled = re.sub(r"\{[^}]+\}", "1", path)
        routes.extend((method.upper(), filled) for method in sorted(operations))
    return routes


@pytest.mark.parametrize(("method", "path"), planner_routes())
def test_given_no_sign_in_when_any_planner_route_is_called_then_it_answers_401(
    anonymous_client: TestClient, wedding: Wedding, method: str, path: str
):
    response = anonymous_client.request(method, path)

    assert response.status_code == 401


def test_given_the_planner_routes_when_they_are_listed_then_the_guest_list_is_among_them():
    """Guards the test above: an empty list would pass it without checking anything."""
    assert ("GET", "/api/weddings/1/guests") in planner_routes()


def test_given_no_sign_in_when_a_guest_opens_their_rsvp_link_then_it_still_works(
    anonymous_client: TestClient, db_session: Session, wedding: Wedding
):
    family = Household(wedding_id=wedding.id, name="Rossi")
    db_session.add(family)
    db_session.commit()

    response = anonymous_client.get(f"/api/rsvp/{family.rsvp_token}")

    assert response.status_code == 200


def test_given_a_signed_in_user_when_the_planner_is_used_then_it_answers(
    anonymous_client: TestClient, db_session: Session, vicky: UserAccount
):
    sign_in(anonymous_client, db_session, vicky)

    response = anonymous_client.get("/api/weddings")

    assert response.status_code == 200


def test_given_a_signed_in_user_when_they_ask_who_they_are_then_their_name_and_email_come_back(
    anonymous_client: TestClient, db_session: Session, vicky: UserAccount
):
    sign_in(anonymous_client, db_session, vicky)

    response = anonymous_client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json() == {"email": "vicky@example.com", "display_name": "Vicky"}


def test_given_no_sign_in_when_they_ask_who_they_are_then_it_answers_401(anonymous_client: TestClient):
    assert anonymous_client.get("/api/auth/me").status_code == 401


def test_given_a_made_up_session_cookie_when_the_planner_is_used_then_it_answers_401(
    anonymous_client: TestClient, vicky: UserAccount
):
    anonymous_client.cookies.set(SESSION_COOKIE, "guessed")

    assert anonymous_client.get("/api/weddings").status_code == 401


def test_given_an_expired_session_when_the_planner_is_used_then_it_answers_401(
    anonymous_client: TestClient, db_session: Session, vicky: UserAccount
):
    token = start_session(db_session, vicky, now=datetime.now(timezone.utc) - timedelta(days=31))
    anonymous_client.cookies.set(SESSION_COOKIE, token)

    assert anonymous_client.get("/api/weddings").status_code == 401


def test_given_a_new_session_when_it_is_stored_then_only_a_hash_of_the_token_is_kept(
    db_session: Session, vicky: UserAccount
):
    """A copy of the database must not be enough to sign in."""
    token = start_session(db_session, vicky)

    stored = db_session.scalars(select(UserSession)).one()
    assert stored.token_hash == hash_token(token)
    assert stored.token_hash != token


def test_given_a_user_of_one_wedding_when_they_reach_for_another_then_it_is_not_found(
    anonymous_client: TestClient, db_session: Session, vicky: UserAccount
):
    other = Wedding(name="Another couple")
    db_session.add(other)
    db_session.commit()
    sign_in(anonymous_client, db_session, vicky)

    response = anonymous_client.get(f"/api/weddings/{other.id}/guests")

    assert response.status_code == 404


def test_given_a_signed_in_user_when_they_sign_out_then_the_session_is_gone(
    anonymous_client: TestClient, db_session: Session, vicky: UserAccount
):
    sign_in(anonymous_client, db_session, vicky)

    response = anonymous_client.post("/api/auth/logout")

    assert response.status_code == 204
    assert db_session.scalars(select(UserSession)).all() == []
    assert f'{SESSION_COOKIE}=""' in response.headers["set-cookie"]
    anonymous_client.cookies.clear()
    assert anonymous_client.get("/api/weddings").status_code == 401


def test_given_no_sign_in_when_sign_out_is_asked_for_then_it_still_succeeds(anonymous_client: TestClient):
    assert anonymous_client.post("/api/auth/logout").status_code == 204


def start_google_sign_in(client: TestClient) -> dict[str, str]:
    response = client.get("/api/auth/google/start")
    assert response.status_code == 302
    query = parse_qs(urlparse(response.headers["location"]).query)
    return {key: values[0] for key, values in query.items()}


def test_given_google_sign_in_when_it_starts_then_the_browser_is_sent_to_google_with_pkce(
    anonymous_client: TestClient,
):
    response = anonymous_client.get("/api/auth/google/start")

    location = urlparse(response.headers["location"])
    query = parse_qs(location.query)
    assert response.status_code == 302
    assert f"{location.scheme}://{location.netloc}{location.path}" == "https://accounts.google.com/o/oauth2/v2/auth"
    assert query["client_id"] == [CLIENT_ID]
    assert query["redirect_uri"] == [f"{PLANNER_URL}/api/auth/google/callback"]
    assert query["response_type"] == ["code"]
    assert query["scope"] == ["openid email profile"]
    assert query["code_challenge_method"] == ["S256"]
    assert len(query["state"][0]) >= 32
    assert len(query["nonce"][0]) >= 32
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "Secure" in cookie and "samesite=lax" in cookie.lower()


def test_given_google_is_not_set_up_when_sign_in_starts_then_the_login_page_says_so(
    anonymous_client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "google_client_id", "")

    response = anonymous_client.get("/api/auth/google/start")

    assert response.status_code == 302
    assert response.headers["location"] == f"{PLANNER_URL}/login?error=not_configured"


def finish_google_sign_in(client: TestClient, google: FakeGoogle, **claims):
    sent = start_google_sign_in(client)
    google.id_token = google_id_token(nonce=sent["nonce"], **claims)
    return client.get("/api/auth/google/callback", params={"code": "the-code", "state": sent["state"]})


def test_given_a_listed_google_account_when_google_sends_it_back_then_a_session_starts(
    anonymous_client: TestClient, db_session: Session, google: FakeGoogle, vicky: UserAccount
):
    response = finish_google_sign_in(anonymous_client, google)

    assert response.status_code == 302
    assert response.headers["location"] == f"{PLANNER_URL}/"
    assert google.exchanged[0][0] == "the-code"
    stored = db_session.scalars(select(UserSession)).one()
    assert stored.user_account_id == vicky.id
    cookie = next(value for value in response.headers.get_list("set-cookie") if value.startswith(SESSION_COOKIE))
    assert "HttpOnly" in cookie and "Secure" in cookie and "samesite=strict" in cookie.lower()
    assert anonymous_client.get("/api/auth/me").json()["display_name"] == "Vicky"


def test_given_the_email_in_another_case_when_google_sends_it_back_then_it_still_matches(
    anonymous_client: TestClient, google: FakeGoogle, vicky: UserAccount
):
    response = finish_google_sign_in(anonymous_client, google, email="Vicky@Example.COM")

    assert response.headers["location"] == f"{PLANNER_URL}/"


def test_given_a_google_account_not_on_the_list_when_it_comes_back_then_no_session_starts(
    anonymous_client: TestClient, db_session: Session, google: FakeGoogle, vicky: UserAccount
):
    response = finish_google_sign_in(anonymous_client, google, email="stranger@example.com")

    assert response.headers["location"] == f"{PLANNER_URL}/login?error=not_allowed"
    assert db_session.scalars(select(UserSession)).all() == []


@pytest.mark.parametrize(
    "claims",
    [
        {"email_verified": False},
        {"aud": "someone-elses-client"},
        {"iss": "https://evil.example.com"},
        {"exp": 1},
        {"nonce": "replayed"},
    ],
    ids=["unverified email", "other audience", "other issuer", "expired", "wrong nonce"],
)
def test_given_a_token_that_fails_a_check_when_it_comes_back_then_no_session_starts(
    anonymous_client: TestClient, db_session: Session, google: FakeGoogle, vicky: UserAccount, claims: dict
):
    sent = start_google_sign_in(anonymous_client)
    google.id_token = google_id_token(**{"nonce": sent["nonce"], **claims})

    response = anonymous_client.get("/api/auth/google/callback", params={"code": "c", "state": sent["state"]})

    assert response.headers["location"] == f"{PLANNER_URL}/login?error=failed"
    assert db_session.scalars(select(UserSession)).all() == []


def test_given_a_state_that_does_not_match_when_google_comes_back_then_no_session_starts(
    anonymous_client: TestClient, db_session: Session, google: FakeGoogle, vicky: UserAccount
):
    """Someone else's sign-in link must not land in this browser."""
    sent = start_google_sign_in(anonymous_client)
    google.id_token = google_id_token(nonce=sent["nonce"])

    response = anonymous_client.get("/api/auth/google/callback", params={"code": "c", "state": "forged"})

    assert response.headers["location"] == f"{PLANNER_URL}/login?error=failed"
    assert google.exchanged == []
    assert db_session.scalars(select(UserSession)).all() == []


def test_given_no_sign_in_was_started_when_google_comes_back_then_no_session_starts(
    anonymous_client: TestClient, google: FakeGoogle, vicky: UserAccount
):
    response = anonymous_client.get("/api/auth/google/callback", params={"code": "c", "state": "s"})

    assert response.headers["location"] == f"{PLANNER_URL}/login?error=failed"
    assert google.exchanged == []


def test_given_the_user_cancels_at_google_when_google_comes_back_then_the_login_page_reopens(
    anonymous_client: TestClient, google: FakeGoogle
):
    sent = start_google_sign_in(anonymous_client)

    response = anonymous_client.get(
        "/api/auth/google/callback", params={"error": "access_denied", "state": sent["state"]}
    )

    assert response.headers["location"] == f"{PLANNER_URL}/login?error=cancelled"
    assert google.exchanged == []
