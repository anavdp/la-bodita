from enum import Enum

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, event, false
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from app.database import Base
from app.models.household import Household
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin, stored_as_text, utc_now


class GuestGender(str, Enum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"


class GuestRelationshipType(str, Enum):
    FAMILY = "family"
    FRIENDS = "friends"
    BRIDE_FRIENDS = "bride_friends"
    GROOM_FRIENDS = "groom_friends"
    PLUS_ONE = "plus_one"
    OTHER = "other"


class GuestSide(str, Enum):
    VENEZUELA = "venezuela"
    ITALY = "italy"
    SPAIN = "spain"
    USA = "usa"
    OTHER = "other"


class RsvpStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"


class Guest(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """Someone invited to the wedding.

    A guest points up at its wedding and at the household it is invited with.
    `phone` and `email` are captured now; the features that use them (invites,
    reminders) are post-MVP.
    """

    __tablename__ = "guest"

    household_id: Mapped[int] = mapped_column(
        ForeignKey("household.id", ondelete="CASCADE"), index=True
    )
    household: Mapped[Household] = relationship(back_populates="guests")
    first_name: Mapped[str]
    last_name: Mapped[str]
    # Drives budgeting: children are usually costed differently by the venue.
    is_child: Mapped[bool] = mapped_column(default=False, server_default=false())
    gender: Mapped[GuestGender | None] = mapped_column(
        stored_as_text(GuestGender, "gender"), default=None
    )
    # Optional so a guest can be added (or bulk-imported) by name alone.
    relationship_type: Mapped[GuestRelationshipType | None] = mapped_column(
        stored_as_text(GuestRelationshipType, "relationship_type"), default=None
    )
    side: Mapped[GuestSide | None] = mapped_column(
        stored_as_text(GuestSide, "side"), default=None
    )
    rsvp_status: Mapped[RsvpStatus] = mapped_column(
        stored_as_text(RsvpStatus, "rsvp_status"),
        default=RsvpStatus.PENDING,
        server_default=RsvpStatus.PENDING.value,
    )
    # When the current answer was given, so the newest answers can be listed first.
    # Kept up to date by `stamp_rsvp_answer`, never set by hand.
    rsvp_answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    phone: Mapped[str | None] = mapped_column(default=None)
    email: Mapped[str | None] = mapped_column(default=None)


@event.listens_for(Guest.rsvp_status, "set", active_history=True)
def stamp_rsvp_answer(guest: Guest, value: RsvpStatus, old_value, initiator) -> None:
    """A new answer is stamped with the moment it was given; back to pending, the stamp goes.

    Hooked on the attribute so the RSVP pages, the planner and an import all
    follow the same rule. Giving the same answer again keeps the first moment.
    """
    if value == old_value:
        return
    guest.rsvp_answered_at = None if value == RsvpStatus.PENDING else utc_now()


def household_of_one(guest: Guest) -> Household:
    """A new household for a guest invited alone, named after them."""
    return Household(wedding_id=guest.wedding_id, name=f"{guest.first_name} {guest.last_name}")


@event.listens_for(Session, "before_flush")
def give_lone_guests_a_household(session: Session, flush_context, instances) -> None:
    """A guest added without a household is invited alone: a household of one.

    Done at flush time so every way a guest is created - the API, an import, the
    seed script, a test - gets the same rule without having to remember it.
    """
    for guest in session.new:
        if isinstance(guest, Guest) and guest.household_id is None and guest.household is None:
            guest.household = household_of_one(guest)
