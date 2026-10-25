from typing import Annotated

from pydantic import BaseModel, StringConstraints, model_validator

from app.schemas.category import reject_cleared

PaperName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class PaperRequestCreate(BaseModel):
    """On an item, or on one of its tasks (then the item is the task's)."""

    name: PaperName
    item_id: int | None = None
    requirement_id: int | None = None
    person_id: int | None = None


class PaperRequestUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it."""

    name: PaperName | None = None
    requirement_id: int | None = None
    person_id: int | None = None
    document_id: int | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "PaperRequestUpdate":
        reject_cleared(self, ("name",))
        return self


class PaperRequestRead(BaseModel):
    id: int
    name: str
    item_id: int
    item_name: str
    category_id: int | None
    requirement_id: int | None
    requirement_title: str | None
    person_id: int | None
    document_id: int | None
    document_title: str | None
    is_missing: bool
