from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.documents import find_person, find_requirement, get_scoped_document, unprocessable
from app.api.guests import SessionDependency, WeddingDependency
from app.api.requirements import find_item
from app.auth import CurrentUser
from app.models import Document, Item, PaperRequest, Requirement, UserAccount, Wedding
from app.privacy import can_see_item, visible_item
from app.schemas import PaperRequestCreate, PaperRequestRead, PaperRequestUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/paper-requests", tags=["documents"])


def to_read(request: PaperRequest) -> PaperRequestRead:
    return PaperRequestRead(
        id=request.id,
        name=request.name,
        item_id=request.item_id,
        item_name=request.item.name,
        category_id=request.item.category_id,
        requirement_id=request.requirement_id,
        requirement_title=request.requirement.title if request.requirement else None,
        person_id=request.person_id,
        document_id=request.document_id,
        document_title=request.document.title if request.document else None,
        is_missing=request.document_id is None,
    )


def get_scoped_request(
    request_id: int, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> PaperRequest:
    request = session.get(PaperRequest, request_id)
    if request is None or request.wedding_id != wedding.id or not can_see_item(request.item, account):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper request not found")
    return request


PaperRequestDependency = Annotated[PaperRequest, Depends(get_scoped_request)]


def find_document(
    session: Session, wedding: Wedding, account: UserAccount | None, document_id: int | None
) -> Document | None:
    if document_id is None:
        return None
    try:
        return get_scoped_document(document_id, wedding, session, account)
    except HTTPException as missing:
        raise unprocessable("Document not found") from missing


def task_of(item: Item, task: Requirement | None) -> Requirement | None:
    if task is not None and task.item_id != item.id:
        raise unprocessable("That task belongs to another item")
    return task


@router.get("", response_model=list[PaperRequestRead])
def list_paper_requests(
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
    item_id: int | None = None,
    missing: bool | None = None,
) -> list[PaperRequestRead]:
    """In the order they were asked for."""
    statement = (
        select(PaperRequest)
        .join(Item)
        .where(PaperRequest.wedding_id == wedding.id, visible_item(account))
        .options(
            selectinload(PaperRequest.item), selectinload(PaperRequest.requirement), selectinload(PaperRequest.document)
        )
        .order_by(PaperRequest.id)
    )
    if item_id is not None:
        statement = statement.where(PaperRequest.item_id == item_id)
    if missing is not None:
        statement = statement.where(PaperRequest.document_id.is_(None) if missing else PaperRequest.document_id.is_not(None))
    return [to_read(request) for request in session.scalars(statement)]


@router.post("", response_model=PaperRequestRead, status_code=status.HTTP_201_CREATED)
def create_paper_request(
    payload: PaperRequestCreate, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> PaperRequestRead:
    task = find_requirement(session, wedding, account, payload.requirement_id)
    item = find_item(session, wedding, account, payload.item_id) or (task.item if task else None)
    if item is None:
        raise unprocessable("A paper is asked for by an item or one of its tasks")
    request = PaperRequest(
        wedding_id=wedding.id,
        item=item,
        requirement=task_of(item, task),
        name=payload.name,
        person=find_person(session, wedding, payload.person_id),
    )
    session.add(request)
    session.commit()
    session.refresh(request)
    return to_read(request)


@router.patch("/{request_id}", response_model=PaperRequestRead)
def update_paper_request(
    payload: PaperRequestUpdate,
    request: PaperRequestDependency,
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
) -> PaperRequestRead:
    """Pointing it at a paper answers it; pointing it at none makes it missing again."""
    changes = payload.model_dump(exclude_unset=True)
    if "requirement_id" in changes:
        request.requirement = task_of(request.item, find_requirement(session, wedding, account, changes.pop("requirement_id")))
    if "person_id" in changes:
        request.person = find_person(session, wedding, changes.pop("person_id"))
    if "document_id" in changes:
        request.document = find_document(session, wedding, account, changes.pop("document_id"))
    for field, value in changes.items():
        setattr(request, field, value)
    session.commit()
    session.refresh(request)
    return to_read(request)


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper_request(request: PaperRequestDependency, session: SessionDependency) -> None:
    """The paper that answered it stays: other items may still need it."""
    session.delete(request)
    session.commit()
