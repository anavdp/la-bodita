"""Sharing files from the phone's share menu (#43).

An iPhone web app can't sit in the share menu, so an iOS Shortcut does. It asks
which item and task the files go to - as plain labels it shows in a list - and
sends them here with the person's phone key instead of the sign-in cookie.
Labels, not ids, so the Shortcut needs no lookups of its own.
"""

from typing import Annotated

from fastapi import APIRouter, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.documents import StorageDependency, check_file, new_document, place, require_storage, save_documents
from app.api.guests import SessionDependency
from app.auth import PhoneUser
from app.models import Category, Item, Requirement, UserAccount, Wedding
from app.privacy import visible_item

router = APIRouter(prefix="/api/share", tags=["share"])

NO_ITEM = "No item · just ours"
NO_TASK = "No task"


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
    labelled = [(f"{item.category.emoji} {item.name}" if item.category and item.category.emoji else item.name, item) for item in items]
    return {NO_ITEM: None} | unique_labels(labelled)  # type: ignore[return-value]


def task_labels(item: Item | None) -> dict[str, Requirement | None]:
    tasks = sorted(item.requirements, key=lambda task: (task.title, task.id)) if item else []
    return {NO_TASK: None} | unique_labels([(task.title, task) for task in tasks])  # type: ignore[return-value]


def pick(labels: dict, label: str | None, what: str):
    if not label:
        return None
    if label not in labels:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"{what} not found")
    return labels[label]


@router.get("/items", response_model=list[str])
def list_item_labels(session: SessionDependency, account: PhoneUser) -> list[str]:
    return list(item_labels(session, account))


@router.post("/tasks", response_model=list[str])
def list_task_labels(session: SessionDependency, account: PhoneUser, item: Annotated[str, Form()]) -> list[str]:
    return list(task_labels(pick(item_labels(session, account), item, "Item")))


@router.post("", response_model=Shared, status_code=status.HTTP_201_CREATED)
def share_files(
    file: list[UploadFile],
    session: SessionDependency,
    account: PhoneUser,
    storage: StorageDependency,
    item: Annotated[str | None, Form()] = None,
    task: Annotated[str | None, Form()] = None,
) -> Shared:
    """Every shared file lands on the chosen item (and task), or none does."""
    bucket = require_storage(storage)
    checked = [(upload, *check_file(upload)) for upload in file]
    chosen_item = pick(item_labels(session, account), item, "Item")
    chosen_task = pick(task_labels(chosen_item), task, "Task")

    wedding = session.get(Wedding, account.wedding_id)
    uploads = []
    for upload, content_type, size in checked:
        document = new_document(bucket, wedding, account, upload, content_type, size)
        place(document, chosen_item, chosen_task)
        uploads.append((document, upload))
    save_documents(session, bucket, uploads)

    where = chosen_item.name if chosen_item else "Documents"
    return Shared(message=f"Saved {len(uploads)} files to {where}" if len(uploads) > 1 else f"Saved to {where}")
