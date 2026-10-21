from datetime import date, time
from typing import Annotated

from pydantic import BaseModel, StringConstraints, model_validator

from app.models.item import ItemStatus
from app.schemas.category import reject_cleared
from app.schemas.guest import OptionalText, RequiredText

Link = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]


class ItemFields(BaseModel):
    """What describes an item; everything but the name is optional."""

    name: RequiredText
    category_id: int | None = None
    subcategory_id: int | None = None
    status: ItemStatus = ItemStatus.IDEA
    contact_name: OptionalText | None = None
    phone: OptionalText | None = None
    email: OptionalText | None = None
    instagram_url: Link | None = None
    website_url: Link | None = None
    notes: Notes | None = None


class ItemCreate(ItemFields):
    pass


class ItemUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it."""

    name: RequiredText | None = None
    category_id: int | None = None
    subcategory_id: int | None = None
    status: ItemStatus | None = None
    contact_name: OptionalText | None = None
    phone: OptionalText | None = None
    email: OptionalText | None = None
    instagram_url: Link | None = None
    website_url: Link | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "ItemUpdate":
        reject_cleared(self, ("name", "status"))
        return self


class NextTask(BaseModel):
    """The item's earliest open task with a date: usually its next appointment."""

    id: int
    title: str
    due_date: date
    due_time: time | None


class ItemRead(BaseModel):
    id: int
    name: str
    category_id: int | None
    subcategory_id: int | None
    status: ItemStatus
    contact_name: str | None
    phone: str | None
    email: str | None
    instagram_url: str | None
    website_url: str | None
    notes: str | None
    task_count: int
    done_task_count: int
    next_task: NextTask | None
