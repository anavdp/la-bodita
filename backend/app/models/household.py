import secrets
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin

if TYPE_CHECKING:
    from app.models.guest import Guest


def new_rsvp_token() -> str:
    """32 url-safe characters: the household's private link, so it must not be guessable."""
    return secrets.token_urlsafe(24)


class Household(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """The people invited together, who answer the RSVP through one shared link.

    Every guest belongs to exactly one household; someone invited alone is a
    household of one. The RSVP itself is still per guest, so any combination of
    members can come.
    """

    __tablename__ = "household"

    # Optional: a household of one is labelled by its member, a family by its CSV name.
    name: Mapped[str | None] = mapped_column(default=None)
    rsvp_token: Mapped[str] = mapped_column(unique=True, default=new_rsvp_token)

    guests: Mapped[list["Guest"]] = relationship(
        back_populates="household",
        order_by="(Guest.last_name, Guest.first_name, Guest.id)",
        passive_deletes=True,
    )
