from datetime import date, time
from typing import Annotated

from pydantic import BaseModel, StringConstraints, model_validator

from app.schemas.category import reject_cleared

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


class RequirementCreate(BaseModel):
    title: Title
    item_id: int | None = None
    due_date: date | None = None
    due_time: time | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def reject_a_time_without_a_date(self) -> "RequirementCreate":
        if self.due_time is not None and self.due_date is None:
            raise ValueError("a time needs a date")
        return self


class RequirementUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it.

    `item_id: null` turns it into a general task.
    """

    title: Title | None = None
    item_id: int | None = None
    is_done: bool | None = None
    due_date: date | None = None
    due_time: time | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "RequirementUpdate":
        reject_cleared(self, ("title", "is_done"))
        return self


class RequirementRead(BaseModel):
    """A task, with enough of its item to show and filter it on the checklist."""

    id: int
    title: str
    is_done: bool
    due_date: date | None
    due_time: time | None
    notes: str | None
    item_id: int | None
    item_name: str | None
    category_id: int | None
