from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.guests import SessionDependency, WeddingDependency
from app.models import Item, Requirement, Wedding
from app.schemas import RequirementCreate, RequirementRead, RequirementUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/requirements", tags=["requirements"])


def to_read(task: Requirement) -> RequirementRead:
    return RequirementRead(
        id=task.id,
        title=task.title,
        is_done=task.is_done,
        due_date=task.due_date,
        due_time=task.due_time,
        notes=task.notes,
        item_id=task.item_id,
        item_name=task.item.name if task.item else None,
        category_id=task.item.category_id if task.item else None,
    )


def get_scoped_requirement(requirement_id: int, wedding: WeddingDependency, session: SessionDependency) -> Requirement:
    task = session.get(Requirement, requirement_id)
    if task is None or task.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


RequirementDependency = Annotated[Requirement, Depends(get_scoped_requirement)]


def find_item(session: Session, wedding: Wedding, item_id: int | None) -> Item | None:
    """An item named in a request body: a bad id is a bad payload, hence 422."""
    if item_id is None:
        return None
    item = session.get(Item, item_id)
    if item is None or item.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Item not found")
    return item


@router.get("", response_model=list[RequirementRead])
def list_requirements(
    wedding: WeddingDependency,
    session: SessionDependency,
    item_id: int | None = None,
    category_id: int | None = None,
    is_done: bool | None = None,
) -> list[RequirementRead]:
    """Soonest first; undated tasks last."""
    statement = (
        select(Requirement)
        .where(Requirement.wedding_id == wedding.id)
        .options(selectinload(Requirement.item))
        .order_by(
            Requirement.due_date.is_(None),
            Requirement.due_date,
            Requirement.due_time.is_not(None),
            Requirement.due_time,
            Requirement.id,
        )
    )
    if item_id is not None:
        statement = statement.where(Requirement.item_id == item_id)
    if category_id is not None:
        statement = statement.join(Item).where(Item.category_id == category_id)
    if is_done is not None:
        statement = statement.where(Requirement.is_done == is_done)
    return [to_read(task) for task in session.scalars(statement)]


@router.post("", response_model=RequirementRead, status_code=status.HTTP_201_CREATED)
def create_requirement(
    payload: RequirementCreate, wedding: WeddingDependency, session: SessionDependency
) -> RequirementRead:
    fields = payload.model_dump()
    task = Requirement(wedding_id=wedding.id, item=find_item(session, wedding, fields.pop("item_id")), **fields)
    session.add(task)
    session.commit()
    session.refresh(task)
    return to_read(task)


@router.patch("/{requirement_id}", response_model=RequirementRead)
def update_requirement(
    payload: RequirementUpdate, task: RequirementDependency, wedding: WeddingDependency, session: SessionDependency
) -> RequirementRead:
    changes = payload.model_dump(exclude_unset=True)
    if "item_id" in changes:
        task.item = find_item(session, wedding, changes.pop("item_id"))
    for field, value in changes.items():
        setattr(task, field, value)
    # A time only means something on a day: clearing the date clears it.
    if task.due_date is None:
        if "due_time" in changes and task.due_time is not None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="A time needs a date")
        task.due_time = None
    session.commit()
    session.refresh(task)
    return to_read(task)


@router.delete("/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(task: RequirementDependency, session: SessionDependency) -> None:
    session.delete(task)
    session.commit()
