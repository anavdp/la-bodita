from fastapi.testclient import TestClient

from app.main import app


def test_given_running_app_when_health_is_requested_then_it_reports_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_given_running_app_when_root_is_requested_then_it_reports_the_app_name():
    client = TestClient(app)

    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["name"] == "La Bodita API"
