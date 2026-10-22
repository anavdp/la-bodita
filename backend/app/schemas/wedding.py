from datetime import date

from pydantic import BaseModel, ConfigDict, model_validator

from app.schemas.category import reject_cleared
from app.schemas.guest import RequiredText


class WeddingRead(BaseModel):
    """The tenant root as the UI needs it: which wedding, and when."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    wedding_date: date | None


class WeddingUpdate(BaseModel):
    """What Settings change: an omitted field is left alone, and only the date can be cleared."""

    name: RequiredText | None = None
    wedding_date: date | None = None

    @model_validator(mode="after")
    def reject_a_cleared_name(self) -> "WeddingUpdate":
        reject_cleared(self, ("name",))
        return self
