import logging
from datetime import date
from functools import lru_cache
from pathlib import PurePath
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.guests import SessionDependency, WeddingDependency
from app.api.requirements import find_item
from app.auth import CurrentUser
from app.config import settings
from app.models import Document, DocumentKind, Item, Requirement, UserAccount, Wedding
from app.privacy import can_see_item, visible_item
from app.schemas import DocumentRead, DocumentUpdate
from app.storage import DocumentStorage, StorageNotConfigured

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/weddings/{wedding_id}/documents", tags=["documents"])

# A phone photo is a few MB and a scanned certificate less; this leaves room for a long contract.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
# What a browser can show: photos (HEIC straight from an iPhone) and PDFs. Never HTML or SVG.
ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
}


@lru_cache
def _configured_storage() -> DocumentStorage | None:
    try:
        return DocumentStorage.from_settings(settings)
    except StorageNotConfigured as reason:
        logger.warning("%s Uploading and opening documents is off.", reason)
        return None


def get_document_storage() -> DocumentStorage | None:
    """The bucket, or None while documents aren't set up (deploy/README.md, step 10)."""
    return _configured_storage()


StorageDependency = Annotated[DocumentStorage | None, Depends(get_document_storage)]


def require_storage(storage: DocumentStorage | None) -> DocumentStorage:
    if storage is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Documents aren't set up yet: the bucket is missing (deploy/README.md, step 10)",
        )
    return storage


def to_read(document: Document) -> DocumentRead:
    return DocumentRead(
        id=document.id,
        title=document.title,
        kind=document.kind,
        file_name=document.file_name,
        content_type=document.content_type,
        size_bytes=document.size_bytes,
        item_id=document.item_id,
        item_name=document.item.name if document.item else None,
        category_id=document.item.category_id if document.item else None,
        requirement_id=document.requirement_id,
        requirement_title=document.requirement.title if document.requirement else None,
        person_id=document.person_id,
        issued_on=document.issued_on,
        expires_on=document.expires_on,
        uploaded_by_id=document.uploaded_by_id,
        created_at=document.created_at,
    )


def get_scoped_document(
    document_id: int, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> Document:
    """A file under an item hidden from this user is hidden with it."""
    document = session.get(Document, document_id)
    if document is None or document.wedding_id != wedding.id or (document.item and not can_see_item(document.item, account)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


DocumentDependency = Annotated[Document, Depends(get_scoped_document)]


def unprocessable(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail)


def find_requirement(
    session: Session, wedding: Wedding, account: UserAccount | None, requirement_id: int | None
) -> Requirement | None:
    if requirement_id is None:
        return None
    task = session.get(Requirement, requirement_id)
    if task is None or task.wedding_id != wedding.id or (task.item and not can_see_item(task.item, account)):
        raise unprocessable("Task not found")
    return task


def find_person(session: Session, wedding: Wedding, person_id: int | None) -> UserAccount | None:
    if person_id is None:
        return None
    person = session.get(UserAccount, person_id)
    if person is None or person.wedding_id != wedding.id:
        raise unprocessable("Person not found")
    return person


def place(document: Document, item: Item | None, task: Requirement | None) -> None:
    """A file on a task sits on that task's item too, so it shows on both."""
    if task is not None and item is not None and task.item_id != item.id:
        raise unprocessable("That task belongs to another item")
    document.requirement = task
    document.item = task.item if task is not None else item


@router.get("", response_model=list[DocumentRead])
def list_documents(
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
    item_id: int | None = None,
    requirement_id: int | None = None,
    kind: DocumentKind | None = None,
) -> list[DocumentRead]:
    """Newest first: what was just added is what is looked for."""
    statement = (
        select(Document)
        .outerjoin(Item)
        .where(Document.wedding_id == wedding.id, or_(Document.item_id.is_(None), visible_item(account)))
        .options(selectinload(Document.item), selectinload(Document.requirement))
        .order_by(Document.created_at.desc(), Document.id.desc())
    )
    if item_id is not None:
        statement = statement.where(Document.item_id == item_id)
    if requirement_id is not None:
        statement = statement.where(Document.requirement_id == requirement_id)
    if kind is not None:
        statement = statement.where(Document.kind == kind)
    return [to_read(document) for document in session.scalars(statement)]


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile,
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
    storage: StorageDependency,
    title: Annotated[str | None, Form(max_length=200)] = None,
    kind: Annotated[DocumentKind | None, Form()] = None,
    item_id: Annotated[int | None, Form()] = None,
    requirement_id: Annotated[int | None, Form()] = None,
    person_id: Annotated[int | None, Form()] = None,
    issued_on: Annotated[date | None, Form()] = None,
    expires_on: Annotated[date | None, Form()] = None,
) -> DocumentRead:
    """Saves the file to the bucket, then its row. A PDF counts as a paper unless told otherwise."""
    bucket = require_storage(storage)
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only photos and PDFs can be uploaded"
        )
    size = file.size if file.size is not None else len(file.file.read())
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="Files can be up to 25 MB")
    if size == 0:
        raise unprocessable("The file is empty")

    file_name = PurePath(file.filename or "file").name
    document = Document(
        wedding_id=wedding.id,
        title=(title or "").strip() or PurePath(file_name).stem or file_name,
        kind=kind or (DocumentKind.PAPER if content_type == "application/pdf" else DocumentKind.PHOTO),
        file_name=file_name,
        content_type=content_type,
        size_bytes=size,
        storage_key=bucket.new_key(wedding.id),
        person=find_person(session, wedding, person_id),
        issued_on=issued_on,
        expires_on=expires_on,
        uploaded_by=account,
    )
    place(
        document,
        find_item(session, wedding, account, item_id),
        find_requirement(session, wedding, account, requirement_id),
    )

    file.file.seek(0)
    bucket.save(document.storage_key, file.file, content_type)
    session.add(document)
    try:
        session.commit()
    except Exception:
        # No row means no way to find the file again: don't leave it in the bucket.
        session.rollback()
        bucket.delete(document.storage_key)
        raise
    session.refresh(document)
    return to_read(document)


@router.get("/{document_id}/file", response_class=RedirectResponse, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
def open_document(document: DocumentDependency, storage: StorageDependency) -> RedirectResponse:
    """Sends the browser to a link that works for a few minutes, so it is never worth saving."""
    link = require_storage(storage).download_url(document.storage_key, document.file_name)
    return RedirectResponse(link, status_code=status.HTTP_307_TEMPORARY_REDIRECT, headers={"Cache-Control": "no-store"})


@router.patch("/{document_id}", response_model=DocumentRead)
def update_document(
    payload: DocumentUpdate,
    document: DocumentDependency,
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
) -> DocumentRead:
    changes = payload.model_dump(exclude_unset=True)
    item_changed, task_changed = "item_id" in changes, "requirement_id" in changes
    if item_changed or task_changed:
        item = find_item(session, wedding, account, changes.pop("item_id", None))
        task = (
            find_requirement(session, wedding, account, changes.pop("requirement_id"))
            if task_changed
            else document.requirement
        )
        if not item_changed:
            item = task.item if task is not None else document.item
        elif not task_changed and task is not None and task.item_id != (item.id if item else None):
            # Moving a file to another item takes it off the old item's task.
            task = None
        place(document, item, task)
    if "person_id" in changes:
        document.person = find_person(session, wedding, changes.pop("person_id"))
    for field, value in changes.items():
        setattr(document, field, value)
    session.commit()
    session.refresh(document)
    return to_read(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document: DocumentDependency, session: SessionDependency, storage: StorageDependency) -> None:
    key = document.storage_key
    session.delete(document)
    session.commit()
    if storage is not None:
        storage.delete(key)


def delete_files(storage: DocumentStorage | None, documents: list[Document]) -> None:
    """Takes these files out of the bucket, once their rows are gone."""
    if storage is None:
        return
    for document in documents:
        storage.delete(document.storage_key)
