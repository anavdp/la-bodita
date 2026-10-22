from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin

if TYPE_CHECKING:
    from app.models.item import Item


class CalendarEvent(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """Something on the calendar that is not a to-do: a trip, a fair, the wedding weekend.

    One day when `end_date` is empty, a range (a honeymoon) when it is set.
    Appointments stay checklist tasks with a date; the calendar shows both.
    It carries no category: it takes its item's.
    """

    __tablename__ = "calendar_event"

    # An event belongs to its item, so it goes when the item goes.
    item_id: Mapped[int | None] = mapped_column(ForeignKey("item.id", ondelete="CASCADE"), index=True, default=None)
    title: Mapped[str]
    start_date: Mapped[date]
    end_date: Mapped[date | None] = mapped_column(default=None)
    start_time: Mapped[time | None] = mapped_column(default=None)
    notes: Mapped[str | None] = mapped_column(default=None)

    item: Mapped["Item | None"] = relationship(back_populates="calendar_events")
