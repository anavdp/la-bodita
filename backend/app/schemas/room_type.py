from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.guest import OptionalText, RequiredText

RoomCount = Annotated[int, Field(ge=0, le=500)]


class RoomTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    beds: str | None
    available: int


class RoomTypeCreate(BaseModel):
    name: RequiredText
    beds: OptionalText | None = None
    available: RoomCount = 0


class RoomTypeUpdate(BaseModel):
    """Only what is sent changes; an empty `beds` clears it."""

    name: RequiredText | None = None
    beds: OptionalText | None = None
    available: RoomCount | None = None


class BookedRooms(BaseModel):
    """Rooms of one type booked for a household."""

    model_config = ConfigDict(from_attributes=True)

    room_type_id: int
    count: RoomCount
