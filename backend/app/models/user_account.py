from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin


class UserAccount(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """Someone allowed into the planner: the allow-list Google sign-in is checked against.

    There is no sign-up. Rows are added from the command line (`python -m app.users`),
    so the only way in is an email someone put here on purpose.
    """

    __tablename__ = "user_account"

    email: Mapped[str] = mapped_column(unique=True)
    display_name: Mapped[str]

    @validates("email")
    def normalize_email(self, key: str, email: str) -> str:
        return email.strip().lower()


class UserSession(TimestampMixin, PrimaryKeyMixin, Base):
    """One signed-in browser. Only a hash of its cookie is kept, so a copy of the
    database cannot be used to sign in; deleting the row signs that browser out."""

    __tablename__ = "user_session"

    user_account_id: Mapped[int] = mapped_column(
        ForeignKey("user_account.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
