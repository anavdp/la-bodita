import secrets
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin, stored_as_text

if TYPE_CHECKING:
    from app.models.guest import Guest


def new_rsvp_token() -> str:
    """32 url-safe characters: the household's private link, so it must not be guessable."""
    return secrets.token_urlsafe(24)


class BroadcastList(str, Enum):
    """The WhatsApp broadcast list a household's invitation goes out on: the bride's or the groom's."""

    BRIDE = "bride"
    GROOM = "groom"


class Household(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """The people invited together, who answer the RSVP through one shared link.

    Every guest belongs to exactly one household; someone invited alone is a
    household of one. The RSVP itself is still per guest, so any combination of
    members can come.
    """

    __tablename__ = "household"

    # Someone invited alone gets a household named after them; a family is named
    # by the couple (or by the CSV's household column).
    name: Mapped[str]
    rsvp_token: Mapped[str] = mapped_column(unique=True, default=new_rsvp_token)
    # Invitations go out through WhatsApp broadcast lists; this tracks which one,
    # if any, the household has been added to.
    broadcast_list: Mapped[BroadcastList | None] = mapped_column(
        stored_as_text(BroadcastList, "broadcast_list"), default=None
    )

    guests: Mapped[list["Guest"]] = relationship(
        back_populates="household",
        order_by="(Guest.last_name, Guest.first_name, Guest.id)",
        passive_deletes=True,
    )
