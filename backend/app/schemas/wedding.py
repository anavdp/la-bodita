from datetime import date

from pydantic import BaseModel, ConfigDict


class WeddingRead(BaseModel):
    """The tenant root as the UI needs it: which wedding, and when."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    wedding_date: date | None
