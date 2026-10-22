from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.category import Category, Subcategory
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin, stored_as_text

if TYPE_CHECKING:
    from app.models.budget_line import BudgetLine
    from app.models.calendar_event import CalendarEvent
    from app.models.requirement import Requirement


class ItemStatus(str, Enum):
    """Where things stand with a vendor or place, from a saved idea to a booking."""

    IDEA = "idea"
    CONTACTED = "contacted"
    MEETING_SET = "meeting_set"
    BOOKED = "booked"
    DISCARDED = "discarded"


class Item(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """The planning hub: a vendor, the church, a venue candidate, a flight, the dress...

    It is the only table that carries a category, so tasks, appointments, costs and
    files hang off an item and take its category from there, never their own.
    """

    __tablename__ = "item"

    name: Mapped[str]
    # Deleting a tag must not delete what was tagged: the item just loses it.
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("category.id", ondelete="SET NULL"), index=True, default=None
    )
    subcategory_id: Mapped[int | None] = mapped_column(
        ForeignKey("subcategory.id", ondelete="SET NULL"), index=True, default=None
    )
    status: Mapped[ItemStatus] = mapped_column(stored_as_text(ItemStatus, "item_status"), default=ItemStatus.IDEA)
    # How to reach a vendor - mostly found through WhatsApp and Instagram.
    contact_name: Mapped[str | None] = mapped_column(default=None)
    phone: Mapped[str | None] = mapped_column(default=None)
    email: Mapped[str | None] = mapped_column(default=None)
    instagram_url: Mapped[str | None] = mapped_column(default=None)
    website_url: Mapped[str | None] = mapped_column(default=None)
    notes: Mapped[str | None] = mapped_column(default=None)

    category: Mapped[Category | None] = relationship()
    subcategory: Mapped[Subcategory | None] = relationship()
    requirements: Mapped[list["Requirement"]] = relationship(
        back_populates="item",
        order_by="(Requirement.due_date.is_(None), Requirement.due_date, Requirement.due_time, Requirement.id)",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    budget_lines: Mapped[list["BudgetLine"]] = relationship(
        back_populates="item",
        order_by="BudgetLine.id",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    calendar_events: Mapped[list["CalendarEvent"]] = relationship(
        back_populates="item",
        order_by="(CalendarEvent.start_date, CalendarEvent.id)",
        # Not delete-orphan: taking an event off its item keeps the event.
        cascade="all",
        passive_deletes=True,
    )
