from enum import Enum

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import false
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin


class GuestGender(str, Enum):
    FEMALE = "female"
    MALE = "male"
    OTHER = "other"


class GuestRelationshipType(str, Enum):
    FAMILY = "family"
    FRIENDS = "friends"
    OTHER = "other"


class GuestSide(str, Enum):
    VENEZUELA = "venezuela"
    ITALY = "italy"
    SPAIN = "spain"
    OTHER = "other"


class RsvpStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"


def stored_as_text(enum_type: type[Enum], name: str) -> SQLEnum:
    """A Python enum stored as its own lowercase value in a plain text column.

    `values_callable` writes the value ("venezuela") rather than the member name
    ("VENEZUELA"), which is what the API and the UI exchange. `validate_strings`
    makes the ORM reject a value outside the enum, and the request schemas reject
    it earlier still, so no database-level CHECK constraint is used: SQLite cannot
    alter one in place, which would turn "add another side" into a table rebuild,
    and Alembic's autogenerate reports type-generated CHECK constraints as drift
    on every run.
    """
    return SQLEnum(
        enum_type,
        name=name,
        native_enum=False,
        length=20,
        create_constraint=False,
        validate_strings=True,
        values_callable=lambda members: [member.value for member in members],
    )


class Guest(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """Someone invited to the wedding.

    Self-contained by design: a guest points up at its wedding and nothing else.
    `phone` and `email` are captured now; the features that use them (invites,
    reminders) are post-MVP.
    """

    __tablename__ = "guest"

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
    phone: Mapped[str | None] = mapped_column(default=None)
    email: Mapped[str | None] = mapped_column(default=None)
