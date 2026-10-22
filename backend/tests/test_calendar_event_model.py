from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CalendarEvent, Item, Wedding


def test_given_a_one_day_event_when_it_is_saved_then_it_has_no_end_date_or_time(db_session: Session, wedding: Wedding):
    event = CalendarEvent(wedding_id=wedding.id, title="Bridal fair", start_date=date(2026, 11, 7))

    db_session.add(event)
    db_session.commit()
    db_session.expire(event)

    assert (event.end_date, event.start_time, event.item_id, event.notes) == (None, None, None, None)


def test_given_a_trip_when_it_is_saved_then_it_spans_its_dates(db_session: Session, wedding: Wedding):
    honeymoon = Item(wedding_id=wedding.id, name="Los Roques")
    event = CalendarEvent(
        wedding_id=wedding.id,
        item=honeymoon,
        title="Honeymoon",
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 8),
        start_time=time(9, 30),
    )

    db_session.add(event)
    db_session.commit()

    assert (event.start_date, event.end_date, event.start_time) == (date(2026, 11, 1), date(2026, 11, 8), time(9, 30))
    assert [each.title for each in honeymoon.calendar_events] == ["Honeymoon"]


def test_given_an_item_with_events_when_the_item_is_deleted_then_its_events_go_with_it(
    db_session: Session, wedding: Wedding
):
    venue = Item(wedding_id=wedding.id, name="Hacienda La Vega")
    venue.calendar_events = [CalendarEvent(wedding_id=wedding.id, title="Open day", start_date=date(2026, 11, 14))]
    db_session.add(venue)
    db_session.commit()

    db_session.delete(venue)
    db_session.commit()

    assert db_session.scalars(select(CalendarEvent)).all() == []
