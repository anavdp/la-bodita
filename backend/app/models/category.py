from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin


class Category(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """A user-made tag (Church, Photographer, Dress...) that colors items across the app.

    There is no seed list: each couple builds their own.
    """

    __tablename__ = "category"

    name: Mapped[str]
    emoji: Mapped[str | None] = mapped_column(default=None)
    # A CSS hex color such as "#f39237"; its subcategories reuse it.
    color: Mapped[str]

    subcategories: Mapped[list["Subcategory"]] = relationship(
        back_populates="category",
        order_by="(Subcategory.name, Subcategory.id)",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Subcategory(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """A finer tag inside a category. It has its own emoji but always its parent's color."""

    __tablename__ = "subcategory"

    category_id: Mapped[int] = mapped_column(ForeignKey("category.id", ondelete="CASCADE"), index=True)
    name: Mapped[str]
    emoji: Mapped[str | None] = mapped_column(default=None)

    category: Mapped[Category] = relationship(back_populates="subcategories")

    @property
    def color(self) -> str:
        return self.category.color
