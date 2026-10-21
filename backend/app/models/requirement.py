from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin

if TYPE_CHECKING:
    from app.models.item import Item


class Requirement(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """A checklist task: something to do for an item, or for the wedding in general.

    An appointment (a tasting, a fitting, a call) is a task with a date and a time.
    It carries no category: it takes its item's.
    """

    __tablename__ = "requirement"

    # A task belongs to its item, so it goes when the item goes.
    item_id: Mapped[int | None] = mapped_column(ForeignKey("item.id", ondelete="CASCADE"), index=True, default=None)
    title: Mapped[str]
    is_done: Mapped[bool] = mapped_column(default=False, server_default=false())
    due_date: Mapped[date | None] = mapped_column(default=None)
    due_time: Mapped[time | None] = mapped_column(default=None)
    notes: Mapped[str | None] = mapped_column(default=None)

    item: Mapped["Item | None"] = relationship(back_populates="requirements")
