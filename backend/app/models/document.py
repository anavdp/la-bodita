from datetime import date
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin, stored_as_text

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.requirement import Requirement
    from app.models.user_account import UserAccount


class DocumentKind(str, Enum):
    """Photos fill an item's shelf; papers (certificates, contracts, receipts) are
    the ones someone asks for, so they say whose they are and when they expire."""

    PHOTO = "photo"
    PAPER = "paper"


class Document(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """An uploaded file. Its bytes live in the private bucket under `storage_key`;
    this row is what the planner shows and searches.

    It can sit on an item, on a task of that item, or on neither (a passport is
    nobody's vendor). It carries no category: it takes its item's.
    """

    __tablename__ = "document"

    # A vendor's photos and contracts go when the vendor goes.
    item_id: Mapped[int | None] = mapped_column(ForeignKey("item.id", ondelete="CASCADE"), index=True, default=None)
    # Deleting a task keeps its files on the item.
    requirement_id: Mapped[int | None] = mapped_column(
        ForeignKey("requirement.id", ondelete="SET NULL"), index=True, default=None
    )
    title: Mapped[str]
    kind: Mapped[DocumentKind] = mapped_column(stored_as_text(DocumentKind, "document_kind"), default=DocumentKind.PHOTO)
    # As it was uploaded: shown and offered on download, never used in the bucket.
    file_name: Mapped[str]
    content_type: Mapped[str]
    size_bytes: Mapped[int]
    storage_key: Mapped[str] = mapped_column(unique=True)
    # Whose paper it is (a passport is Vicky's); empty for both of them, or for a photo.
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True, default=None
    )
    issued_on: Mapped[date | None] = mapped_column(default=None)
    expires_on: Mapped[date | None] = mapped_column(default=None)
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True, default=None
    )

    item: Mapped["Item | None"] = relationship(back_populates="documents")
    requirement: Mapped["Requirement | None"] = relationship(back_populates="documents")
    person: Mapped["UserAccount | None"] = relationship(foreign_keys=[person_id])
    uploaded_by: Mapped["UserAccount | None"] = relationship(foreign_keys=[uploaded_by_id])
