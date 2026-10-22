from datetime import date, time

from pydantic import BaseModel, model_validator

from app.schemas.category import reject_cleared
from app.schemas.requirement import Notes, Title


def reject_an_end_before_the_start(start_date: date | None, end_date: date | None) -> None:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise ValueError("an event cannot end before it starts")


class CalendarEventCreate(BaseModel):
    title: Title
    start_date: date
    end_date: date | None = None
    start_time: time | None = None
    item_id: int | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def reject_backwards_ranges(self) -> "CalendarEventCreate":
        reject_an_end_before_the_start(self.start_date, self.end_date)
        return self


class CalendarEventUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it.

    `end_date: null` makes it a one-day event, `item_id: null` an event of its own.
    """

    title: Title | None = None
    start_date: date | None = None
    end_date: date | None = None
    start_time: time | None = None
    item_id: int | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "CalendarEventUpdate":
        reject_cleared(self, ("title", "start_date"))
        reject_an_end_before_the_start(self.start_date, self.end_date)
        return self


class CalendarEventRead(BaseModel):
    """An event, with enough of its item to color it by category on the calendar."""

    id: int
    title: str
    start_date: date
    end_date: date | None
    start_time: time | None
    notes: str | None
    item_id: int | None
    item_name: str | None
    category_id: int | None
