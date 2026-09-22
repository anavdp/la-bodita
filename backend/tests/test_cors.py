from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

DEV_ORIGIN = "http://localhost:5173"


def test_given_the_vite_dev_server_when_it_calls_the_api_then_the_response_allows_its_origin():
    """The UI runs on its own port in development, so the API must opt that origin in."""
    client = TestClient(app)

    response = client.get("/health", headers={"Origin": DEV_ORIGIN})

    assert response.headers["access-control-allow-origin"] == DEV_ORIGIN


def test_given_a_preflight_when_it_asks_to_patch_then_the_method_is_allowed():
    client = TestClient(app)

    response = client.options(
        "/api/weddings/1/guests/1",
        headers={
            "Origin": DEV_ORIGIN,
            "Access-Control-Request-Method": "PATCH",
        },
    )

    assert response.status_code == 200
    assert "PATCH" in response.headers["access-control-allow-methods"]


def test_given_an_unlisted_origin_when_it_calls_the_api_then_it_is_not_allowed():
    client = TestClient(app)

    response = client.get("/health", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in response.headers


def test_given_the_settings_when_they_are_read_then_the_dev_origin_is_allowed_by_default():
    assert DEV_ORIGIN in settings.cors_allow_origins
