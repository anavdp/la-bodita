from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import PrimaryKeyMixin, TimestampMixin, WeddingScopedMixin

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.item import Item
    from app.models.requirement import Requirement
    from app.models.user_account import UserAccount


class PaperRequest(WeddingScopedMixin, TimestampMixin, PrimaryKeyMixin, Base):
    """A paper an item asks for: the church wants a baptism certificate from each of us.

    It is missing until a paper answers it. One paper can answer several (the
    registro civil and the consulate both want the passport), so it points at
    the paper, never the reverse.
    """

    __tablename__ = "paper_request"

    item_id: Mapped[int] = mapped_column(ForeignKey("item.id", ondelete="CASCADE"), index=True)
    # The meeting to bring it to; deleting the task keeps the request on the item.
    requirement_id: Mapped[int | None] = mapped_column(
        ForeignKey("requirement.id", ondelete="SET NULL"), index=True, default=None
    )
    name: Mapped[str]
    # Whose paper is wanted; empty when it's one for both of us (the banns form).
    person_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_account.id", ondelete="SET NULL"), index=True, default=None
    )
    # Deleting the paper makes it missing again.
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("document.id", ondelete="SET NULL"), index=True, default=None
    )

    item: Mapped["Item"] = relationship(back_populates="paper_requests")
    requirement: Mapped["Requirement | None"] = relationship()
    person: Mapped["UserAccount | None"] = relationship()
    document: Mapped["Document | None"] = relationship()
