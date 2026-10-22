from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin, stored_as_text

if TYPE_CHECKING:
    from app.models.item import Item


class BudgetLineStatus(str, Enum):
    """Where a cost stands in the plan: switched off, switched on, then booked and paid.

    Several lines of a category can be on at once (a church dress and a civil
    one), so comparing alternatives needs nothing more than these.
    """

    IDEA = "idea"
    CONSIDERING = "considering"
    CONFIRMED = "confirmed"
    PAID = "paid"


class BudgetLine(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """One cost: a quote from an item (a vendor, the church...), or a cost of its own.

    It carries no category: it takes its item's.
    """

    __tablename__ = "budget_line"

    # A quote belongs to its vendor, so it goes when the vendor goes.
    item_id: Mapped[int | None] = mapped_column(ForeignKey("item.id", ondelete="CASCADE"), index=True, default=None)
    title: Mapped[str]
    status: Mapped[BudgetLineStatus] = mapped_column(
        stored_as_text(BudgetLineStatus, "budget_line_status"), default=BudgetLineStatus.IDEA
    )
    # ISO 4217: costs come in dollars in Venezuela and euros in Italy and Spain.
    currency: Mapped[str] = mapped_column(String(3), default="USD", server_default="USD")
    estimated_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=None)
    actual_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=None)
    notes: Mapped[str | None] = mapped_column(default=None)

    item: Mapped["Item | None"] = relationship(back_populates="budget_lines")
