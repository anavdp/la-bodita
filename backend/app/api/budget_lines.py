from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.guests import SessionDependency, WeddingDependency
from app.api.requirements import find_item
from app.auth import CurrentUser
from app.models import BudgetLine, BudgetLineStatus
from app.schemas import BudgetLineCreate, BudgetLineRead, BudgetLineUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/budget-lines", tags=["budget"])


def to_read(line: BudgetLine) -> BudgetLineRead:
    return BudgetLineRead(
        id=line.id,
        title=line.title,
        status=line.status,
        currency=line.currency,
        estimated_amount=line.estimated_amount,
        actual_amount=line.actual_amount,
        notes=line.notes,
        item_id=line.item_id,
        item_name=line.item.name if line.item else None,
        category_id=line.item.category_id if line.item else None,
    )


def get_scoped_line(line_id: int, wedding: WeddingDependency, session: SessionDependency) -> BudgetLine:
    line = session.get(BudgetLine, line_id)
    if line is None or line.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget line not found")
    return line


BudgetLineDependency = Annotated[BudgetLine, Depends(get_scoped_line)]


def require_an_amount_once_on(line: BudgetLine) -> None:
    """A line counts toward the total once it is on, so it needs something to count."""
    if line.status is not BudgetLineStatus.IDEA and line.estimated_amount is None and line.actual_amount is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="A line needs an amount before it counts"
        )


@router.get("", response_model=list[BudgetLineRead])
def list_budget_lines(wedding: WeddingDependency, session: SessionDependency) -> list[BudgetLineRead]:
    """In the order they were added: the screen groups them by category itself."""
    statement = (
        select(BudgetLine)
        .where(BudgetLine.wedding_id == wedding.id)
        .options(selectinload(BudgetLine.item))
        .order_by(BudgetLine.id)
    )
    return [to_read(line) for line in session.scalars(statement)]


@router.post("", response_model=BudgetLineRead, status_code=status.HTTP_201_CREATED)
def create_budget_line(
    payload: BudgetLineCreate, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> BudgetLineRead:
    fields = payload.model_dump()
    line = BudgetLine(
        wedding_id=wedding.id, item=find_item(session, wedding, account, fields.pop("item_id")), **fields
    )
    require_an_amount_once_on(line)
    session.add(line)
    session.commit()
    session.refresh(line)
    return to_read(line)


@router.patch("/{line_id}", response_model=BudgetLineRead)
def update_budget_line(
    payload: BudgetLineUpdate,
    line: BudgetLineDependency,
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
) -> BudgetLineRead:
    changes = payload.model_dump(exclude_unset=True)
    if "item_id" in changes:
        line.item = find_item(session, wedding, account, changes.pop("item_id"))
    for field, value in changes.items():
        setattr(line, field, value)
    try:
        require_an_amount_once_on(line)
    except HTTPException:
        session.rollback()
        raise
    session.commit()
    session.refresh(line)
    return to_read(line)


@router.delete("/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget_line(line: BudgetLineDependency, session: SessionDependency) -> None:
    session.delete(line)
    session.commit()
