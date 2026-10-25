import json
from urllib.parse import parse_qs

import httpx
import pytest

from app.google_sign_in import GoogleSignIn, GoogleSignInError, get_google_sign_in


def test_given_a_code_when_it_is_exchanged_then_google_gets_the_secret_and_verifier_and_the_id_token_comes_back():
    seen: list[httpx.Request] = []

    def token_endpoint(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json={"id_token": "header.payload.signature", "access_token": "unused"})

    google = GoogleSignIn(
        client_id="client",
        client_secret="secret",
        redirect_uri="https://planner.example.com/api/auth/google/callback",
        transport=httpx.MockTransport(token_endpoint),
    )

    id_token = google.exchange("the-code", "the-verifier")

    assert id_token == "header.payload.signature"
    assert str(seen[0].url) == "https://oauth2.googleapis.com/token"
    form = {key: values[0] for key, values in parse_qs(seen[0].content.decode()).items()}
    assert form == {
        "grant_type": "authorization_code",
        "code": "the-code",
        "code_verifier": "the-verifier",
        "client_id": "client",
        "client_secret": "secret",
        "redirect_uri": "https://planner.example.com/api/auth/google/callback",
    }


@pytest.mark.parametrize(
    "response",
    [httpx.Response(400, json={"error": "invalid_grant"}), httpx.Response(200, content=json.dumps({}))],
    ids=["refused", "no id token"],
)
def test_given_google_refuses_the_code_when_it_is_exchanged_then_sign_in_fails(response: httpx.Response):
    google = GoogleSignIn("client", "secret", "https://x/cb", transport=httpx.MockTransport(lambda _: response))

    with pytest.raises(GoogleSignInError):
        google.exchange("the-code", "the-verifier")


def test_given_the_settings_when_the_dependency_is_built_then_it_calls_back_to_the_api_url(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "api_url", "https://planner.example.com")

    google = get_google_sign_in()

    assert google.redirect_uri == "https://planner.example.com/api/auth/google/callback"
