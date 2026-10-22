from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.guests import SessionDependency, WeddingDependency
from app.api.requirements import find_item
from app.models import CalendarEvent
from app.schemas import CalendarEventCreate, CalendarEventRead, CalendarEventUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/calendar-events", tags=["calendar"])


def to_read(event: CalendarEvent) -> CalendarEventRead:
    return CalendarEventRead(
        id=event.id,
        title=event.title,
        start_date=event.start_date,
        end_date=event.end_date,
        start_time=event.start_time,
        notes=event.notes,
        item_id=event.item_id,
        item_name=event.item.name if event.item else None,
        category_id=event.item.category_id if event.item else None,
    )


def get_scoped_event(event_id: int, wedding: WeddingDependency, session: SessionDependency) -> CalendarEvent:
    event = session.get(CalendarEvent, event_id)
    if event is None or event.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


CalendarEventDependency = Annotated[CalendarEvent, Depends(get_scoped_event)]


@router.get("", response_model=list[CalendarEventRead])
def list_calendar_events(wedding: WeddingDependency, session: SessionDependency) -> list[CalendarEventRead]:
    """Soonest first; on the same day, untimed ones before timed ones, then by time."""
    statement = (
        select(CalendarEvent)
        .where(CalendarEvent.wedding_id == wedding.id)
        .options(selectinload(CalendarEvent.item))
        .order_by(
            CalendarEvent.start_date,
            CalendarEvent.start_time.is_not(None),
            CalendarEvent.start_time,
            CalendarEvent.id,
        )
    )
    return [to_read(event) for event in session.scalars(statement)]


@router.post("", response_model=CalendarEventRead, status_code=status.HTTP_201_CREATED)
def create_calendar_event(
    payload: CalendarEventCreate, wedding: WeddingDependency, session: SessionDependency
) -> CalendarEventRead:
    fields = payload.model_dump()
    event = CalendarEvent(wedding_id=wedding.id, item=find_item(session, wedding, fields.pop("item_id")), **fields)
    session.add(event)
    session.commit()
    session.refresh(event)
    return to_read(event)


@router.patch("/{event_id}", response_model=CalendarEventRead)
def update_calendar_event(
    payload: CalendarEventUpdate, event: CalendarEventDependency, wedding: WeddingDependency, session: SessionDependency
) -> CalendarEventRead:
    changes = payload.model_dump(exclude_unset=True)
    if "item_id" in changes:
        event.item = find_item(session, wedding, changes.pop("item_id"))
    for field, value in changes.items():
        setattr(event, field, value)
    # Moving only one end can still turn a range around.
    if event.end_date is not None and event.end_date < event.start_date:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="An event cannot end before it starts"
        )
    session.commit()
    session.refresh(event)
    return to_read(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(event: CalendarEventDependency, session: SessionDependency) -> None:
    session.delete(event)
    session.commit()
