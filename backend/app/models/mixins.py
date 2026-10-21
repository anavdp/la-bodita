from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PrimaryKeyMixin:
    """Surrogate integer primary key, shared by every table."""

    id: Mapped[int] = mapped_column(primary_key=True)


class TimestampMixin:
    """Creation and last-modification stamps, shared by every table."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )


class WeddingScopedMixin:
    """The tenant key every table other than WEDDING carries.

    Onboarding another couple means inserting new WEDDING and USERACCOUNT rows,
    never changing the schema, so every scoped row must name its wedding.
    """

    @declared_attr
    def wedding_id(cls) -> Mapped[int]:
        return mapped_column(
            ForeignKey("wedding.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )


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
