import logging

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.main import create_app


class Echo(BaseModel):
    count: int


@pytest.fixture
def failing_app() -> FastAPI:
    """The real app, plus routes that fail the ways a planner route can."""
    app = create_app()

    @app.get("/test/broken")
    def broken() -> None:
        raise RuntimeError("no such table: calendar_event")

    @app.get("/test/missing")
    def missing() -> None:
        raise HTTPException(status_code=404, detail="Event not found")

    @app.get("/test/conflict")
    def conflict() -> None:
        raise HTTPException(status_code=409, detail="Already answered")

    @app.post("/test/echo")
    def echo(body: Echo) -> Echo:
        return body

    return app


@pytest.fixture
def failing_client(failing_app: FastAPI) -> TestClient:
    return TestClient(failing_app, raise_server_exceptions=False)


def test_given_a_route_that_crashes_when_it_is_called_then_the_answer_is_json_with_a_reference(failing_client):
    response = failing_client.get("/test/broken")

    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "internal_error"
    assert body["detail"] == "Something went wrong on our side."
    assert len(body["request_id"]) == 8
    assert response.headers["x-request-id"] == body["request_id"]


def test_given_a_route_that_crashes_when_it_is_called_then_no_technical_detail_reaches_the_browser(failing_client):
    response = failing_client.get("/test/broken")

    assert "calendar_event" not in response.text
    assert "RuntimeError" not in response.text
    assert "Traceback" not in response.text


def test_given_a_route_that_crashes_when_it_is_called_then_the_log_has_the_traceback_under_the_same_reference(
    failing_client, caplog
):
    with caplog.at_level(logging.ERROR, logger="app.errors"):
        response = failing_client.get("/test/broken")

    request_id = response.json()["request_id"]
    records = [record for record in caplog.records if request_id in record.getMessage()]
    assert len(records) == 1
    assert "GET /test/broken" in records[0].getMessage()
    assert records[0].exc_info is not None
    assert "no such table: calendar_event" in str(records[0].exc_info[1])


def test_given_two_crashes_when_they_are_called_then_each_gets_its_own_reference(failing_client):
    first = failing_client.get("/test/broken").json()["request_id"]
    second = failing_client.get("/test/broken").json()["request_id"]

    assert first != second


def test_given_a_crash_from_the_planner_origin_when_it_is_answered_then_the_browser_may_read_it(failing_client):
    # Without the CORS header the browser hides the body, and with it the reference.
    response = failing_client.get("/test/broken", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_given_something_not_found_when_it_is_asked_for_then_the_answer_names_a_code_and_keeps_the_detail(
    failing_client,
):
    response = failing_client.get("/test/missing")

    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Event not found"
    assert body["code"] == "not_found"
    assert body["request_id"] == response.headers["x-request-id"]


def test_given_a_conflict_when_it_is_answered_then_the_code_says_conflict(failing_client):
    assert failing_client.get("/test/conflict").json()["code"] == "conflict"


def test_given_an_unknown_route_when_it_is_asked_for_then_it_is_a_not_found_with_a_code(failing_client):
    response = failing_client.get("/test/nowhere")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_given_an_invalid_body_when_it_is_sent_then_the_field_errors_stay_and_the_code_says_invalid(failing_client):
    response = failing_client.post("/test/echo", json={"count": "many"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "invalid"
    assert body["detail"][0]["loc"] == ["body", "count"]
    assert body["request_id"]


def test_given_a_signed_out_browser_when_it_calls_the_planner_then_the_code_says_signed_out():
    with TestClient(create_app()) as client:
        response = client.get("/api/weddings")

    assert response.status_code == 401
    assert response.json()["code"] == "signed_out"


def test_given_a_healthy_call_when_it_is_answered_then_it_still_carries_a_reference(failing_client):
    response = failing_client.get("/health")

    assert response.status_code == 200
    assert len(response.headers["x-request-id"]) == 8
