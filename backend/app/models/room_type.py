from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin

if TYPE_CHECKING:
    from app.models.household import Household


class RoomType(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """A kind of hotel room the couple can book for guests (Junior King, Doble...)
    and how many of them the hotel holds for the wedding night."""

    __tablename__ = "room_type"

    name: Mapped[str]
    # What sleeps in it, e.g. "1 double + 2 single", to match rooms to households.
    beds: Mapped[str | None] = mapped_column(default=None)
    available: Mapped[int] = mapped_column(default=0, server_default="0")


class HouseholdRoom(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """How many rooms of one type we book for one household."""

    __tablename__ = "household_room"
    __table_args__ = (UniqueConstraint("household_id", "room_type_id"),)

    household_id: Mapped[int] = mapped_column(ForeignKey("household.id", ondelete="CASCADE"), index=True)
    # A room type in use cannot be deleted (the API refuses), so nothing booked vanishes quietly.
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_type.id", ondelete="RESTRICT"), index=True)
    count: Mapped[int]

    household: Mapped["Household"] = relationship(back_populates="rooms")
