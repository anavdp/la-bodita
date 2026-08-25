from datetime import date

from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin


class Wedding(TimestampMixin, PrimaryKeyMixin, Base):
    """The tenant root: every other table hangs off a wedding.

    Exactly one row exists today. It deliberately carries no `wedding_id` of its
    own - it is the thing being pointed at.
    """

    __tablename__ = "wedding"

    name: Mapped[str]
    wedding_date: Mapped[date | None] = mapped_column(default=None)
