"""Sharing files from the phone's share menu (#43).

An iPhone web app can't sit in the share menu, so an iOS Shortcut does. It shows
the items as plain labels, one question only, and sends the files here with the
person's phone key instead of the sign-in cookie. Labels, not ids, so the
Shortcut needs no lookups; a file is put on a task later, in the planner.
"""

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from starlette.datastructures import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.documents import StorageDependency, check_file, new_document, place, require_storage, save_documents
from app.api.guests import SessionDependency
from app.auth import PhoneUser
from app.models import Category, Item, UserAccount, Wedding
from app.privacy import visible_item

router = APIRouter(prefix="/api/share", tags=["share"])

NO_ITEM = "No item · just ours"


class Shared(BaseModel):
    """What the Shortcut shows in its notification."""

    message: str


def unique_labels(labelled: list[tuple[str, object]]) -> dict[str, object]:
    """Two items with the same name still get a label each: "Hotel", "Hotel (2)"."""
    labels: dict[str, object] = {}
    for label, row in labelled:
        unique, count = label, 1
        while unique in labels:
            count += 1
            unique = f"{label} ({count})"
        labels[unique] = row
    return labels


def item_labels(session: Session, account: UserAccount) -> dict[str, Item | None]:
    """Every item this person may see, grouped by category like the planner, uncategorised last."""
    items = session.scalars(
        select(Item)
        .outerjoin(Category, Item.category_id == Category.id)
        .where(Item.wedding_id == account.wedding_id, visible_item(account))
        .options(selectinload(Item.category))
        .order_by(Category.id.is_(None), Category.name, Item.name, Item.id)
    ).all()
    labelled = [
        (f"{item.category.emoji} {item.name}" if item.category and item.category.emoji else item.name, item)
        for item in items
    ]
    return {NO_ITEM: None} | unique_labels(labelled)  # type: ignore[return-value]


@router.get("/items", response_model=list[str])
def list_item_labels(session: SessionDependency, account: PhoneUser) -> list[str]:
    return list(item_labels(session, account))


@router.post("", response_model=Shared, status_code=status.HTTP_201_CREATED)
async def share_files(request: Request, session: SessionDependency, account: PhoneUser, storage: StorageDependency) -> Shared:
    """Every shared file lands on the chosen item, or none does."""
    bucket = require_storage(storage)
    form = await request.form()
    files = [value for value in form.getlist("file") if isinstance(value, UploadFile)]
    if not files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No file came: in the Shortcut, repeat with each item in Shortcut Input and send Repeat Item as file",
        )
    checked = [(upload, *check_file(upload)) for upload in files]
    label = form.get("item")
    items = item_labels(session, account)
    if isinstance(label, str) and label and label not in items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Item not found")
    chosen_item = items[label] if isinstance(label, str) and label else None

    wedding = session.get(Wedding, account.wedding_id)
    uploads = []
    for upload, content_type, size in checked:
        document = new_document(bucket, wedding, account, upload, content_type, size)
        place(document, chosen_item, None)
        uploads.append((document, upload))
    save_documents(session, bucket, uploads)

    where = chosen_item.name if chosen_item else "Documents"
    return Shared(message=f"Saved {len(uploads)} files to {where}" if len(uploads) > 1 else f"Saved to {where}")
