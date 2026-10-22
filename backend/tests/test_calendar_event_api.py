from datetime import date, time

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CalendarEvent, Category, Item, Wedding

EVENTS_URL = "/api/weddings/{wedding_id}/calendar-events"


def an_event(db_session: Session, wedding: Wedding, title: str, start_date: date, **fields) -> CalendarEvent:
    event = CalendarEvent(wedding_id=wedding.id, title=title, start_date=start_date, **fields)
    db_session.add(event)
    db_session.commit()
    return event


def an_item(db_session: Session, wedding: Wedding, name: str = "Los Roques", category: Category | None = None) -> Item:
    item = Item(wedding_id=wedding.id, name=name, category=category)
    db_session.add(item)
    db_session.commit()
    return item


def event_url(wedding: Wedding, event: CalendarEvent) -> str:
    return f"{EVENTS_URL.format(wedding_id=wedding.id)}/{event.id}"


def test_given_events_when_they_are_listed_then_they_come_soonest_first_by_date_and_time(
    client: TestClient, db_session: Session, wedding: Wedding
):
    an_event(db_session, wedding, "Honeymoon", date(2026, 11, 1))
    an_event(db_session, wedding, "Dinner with the padrinos", date(2026, 10, 24), start_time=time(20, 0))
    an_event(db_session, wedding, "Bridal fair", date(2026, 10, 24), start_time=time(10, 0))

    response = client.get(EVENTS_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    assert [event["title"] for event in response.json()] == ["Bridal fair", "Dinner with the padrinos", "Honeymoon"]


def test_given_an_event_for_an_item_when_it_is_listed_then_it_names_the_item_and_its_category(
    client: TestClient, db_session: Session, wedding: Wedding
):
    travel = Category(wedding_id=wedding.id, name="Honeymoon", color="#4fae7b")
    item = an_item(db_session, wedding, category=travel)
    an_event(
        db_session, wedding, "Honeymoon", date(2026, 11, 1), end_date=date(2026, 11, 8), item=item, notes="Pack light"
    )

    event = client.get(EVENTS_URL.format(wedding_id=wedding.id)).json()[0]

    assert event == {
        "id": event["id"],
        "title": "Honeymoon",
        "start_date": "2026-11-01",
        "end_date": "2026-11-08",
        "start_time": None,
        "notes": "Pack light",
        "item_id": item.id,
        "item_name": "Los Roques",
        "category_id": travel.id,
    }


def test_given_another_weddings_events_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    an_event(db_session, other_wedding, "Not ours", date(2026, 11, 1))

    assert client.get(EVENTS_URL.format(wedding_id=wedding.id)).json() == []


def test_given_a_trip_when_it_is_added_for_an_item_then_it_is_saved_with_its_range(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding)

    response = client.post(
        EVENTS_URL.format(wedding_id=wedding.id),
        json={
            "title": "  Honeymoon ",
            "item_id": item.id,
            "start_date": "2026-11-01",
            "end_date": "2026-11-08",
            "start_time": "09:30",
        },
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Honeymoon"
    assert response.json()["item_name"] == "Los Roques"
    saved = db_session.scalars(select(CalendarEvent)).one()
    assert (saved.start_date, saved.end_date, saved.start_time) == (date(2026, 11, 1), date(2026, 11, 8), time(9, 30))


def test_given_an_end_before_the_start_when_an_event_is_added_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = client.post(
        EVENTS_URL.format(wedding_id=wedding.id),
        json={"title": "Backwards", "start_date": "2026-11-08", "end_date": "2026-11-01"},
    )

    assert response.status_code == 422


def test_given_no_start_date_when_an_event_is_added_then_it_is_rejected(client: TestClient, wedding: Wedding):
    response = client.post(EVENTS_URL.format(wedding_id=wedding.id), json={"title": "Someday"})

    assert response.status_code == 422


def test_given_another_weddings_item_when_an_event_is_added_for_it_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    theirs = an_item(db_session, other_wedding)

    response = client.post(
        EVENTS_URL.format(wedding_id=wedding.id),
        json={"title": "Sneaky", "start_date": "2026-11-01", "item_id": theirs.id},
    )

    assert response.status_code == 422


def test_given_an_event_when_it_is_moved_to_other_days_then_the_new_dates_are_kept(
    client: TestClient, db_session: Session, wedding: Wedding
):
    event = an_event(db_session, wedding, "Honeymoon", date(2026, 11, 1), end_date=date(2026, 11, 8))

    response = client.patch(event_url(wedding, event), json={"start_date": "2026-11-02", "end_date": "2026-11-10"})

    assert response.status_code == 200
    assert (response.json()["start_date"], response.json()["end_date"]) == ("2026-11-02", "2026-11-10")


def test_given_a_trip_when_its_start_moves_past_its_end_then_it_is_rejected_and_unchanged(
    client: TestClient, db_session: Session, wedding: Wedding
):
    event = an_event(db_session, wedding, "Honeymoon", date(2026, 11, 1), end_date=date(2026, 11, 8))

    response = client.patch(event_url(wedding, event), json={"start_date": "2026-11-20"})

    assert response.status_code == 422
    db_session.expire_all()
    assert db_session.get(CalendarEvent, event.id).start_date == date(2026, 11, 1)


def test_given_an_event_when_its_end_date_and_item_are_cleared_then_it_is_a_one_day_event_of_its_own(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding)
    event = an_event(db_session, wedding, "Trip", date(2026, 11, 1), end_date=date(2026, 11, 3), item=item)

    response = client.patch(event_url(wedding, event), json={"end_date": None, "item_id": None})

    assert response.status_code == 200
    assert (response.json()["end_date"], response.json()["item_id"]) == (None, None)


def test_given_an_event_when_its_title_or_start_is_blanked_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    event = an_event(db_session, wedding, "Bridal fair", date(2026, 11, 7))

    assert client.patch(event_url(wedding, event), json={"title": " "}).status_code == 422
    assert client.patch(event_url(wedding, event), json={"start_date": None}).status_code == 422


def test_given_an_event_when_it_is_deleted_then_it_is_gone(client: TestClient, db_session: Session, wedding: Wedding):
    event = an_event(db_session, wedding, "Bridal fair", date(2026, 11, 7))

    response = client.delete(event_url(wedding, event))

    assert response.status_code == 204
    assert db_session.scalars(select(CalendarEvent)).all() == []


def test_given_another_weddings_event_when_it_is_changed_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    theirs = an_event(db_session, other_wedding, "Not ours", date(2026, 11, 1))

    response = client.patch(
        f"{EVENTS_URL.format(wedding_id=wedding.id)}/{theirs.id}", json={"title": "Mine now"}
    )

    assert response.status_code == 404
