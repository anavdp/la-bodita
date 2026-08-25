from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, func
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
