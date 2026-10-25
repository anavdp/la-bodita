from datetime import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.documents import StorageDependency, delete_files
from app.api.guests import SessionDependency, WeddingDependency
from app.auth import CurrentUser
from app.models import Category, Item, Subcategory, UserAccount, Wedding
from app.privacy import account_id, can_see, can_see_item, change_privacy, is_mine, visible_item
from app.schemas import ItemCreate, ItemRead, ItemUpdate, NextTask

router = APIRouter(prefix="/api/weddings/{wedding_id}/items", tags=["items"])


def to_read(item: Item, account: UserAccount | None) -> ItemRead:
    dated_open_tasks = [task for task in item.requirements if not task.is_done and task.due_date is not None]
    next_task = min(dated_open_tasks, key=lambda task: (task.due_date, task.due_time or time.min), default=None)
    return ItemRead(
        id=item.id,
        name=item.name,
        category_id=item.category_id,
        subcategory_id=item.subcategory_id,
        status=item.status,
        contact_name=item.contact_name,
        phone=item.phone,
        email=item.email,
        instagram_url=item.instagram_url,
        website_url=item.website_url,
        notes=item.notes,
        task_count=len(item.requirements),
        done_task_count=sum(task.is_done for task in item.requirements),
        next_task=NextTask.model_validate(next_task, from_attributes=True) if next_task else None,
        is_private=item.is_private,
        is_mine=is_mine(item, account),
    )


def get_scoped_item(
    item_id: int, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> Item:
    """An item hidden from this user (private, or in a private category) answers 404."""
    item = session.get(Item, item_id)
    if item is None or item.wedding_id != wedding.id or not can_see_item(item, account):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


ItemDependency = Annotated[Item, Depends(get_scoped_item)]


def unprocessable(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail)


def resolve_tags(
    session: Session,
    wedding: Wedding,
    account: UserAccount | None,
    category_id: int | None,
    subcategory_id: int | None,
) -> tuple[Category | None, Subcategory | None]:
    """The category and subcategory a request names, both of this wedding and of each other.

    A subcategory on its own brings its category along.
    """
    subcategory = None
    if subcategory_id is not None:
        subcategory = session.get(Subcategory, subcategory_id)
        if subcategory is None or subcategory.wedding_id != wedding.id or not can_see(subcategory.category, account):
            raise unprocessable("Subcategory not found")
        if category_id is not None and category_id != subcategory.category_id:
            raise unprocessable("Subcategory belongs to another category")
        return subcategory.category, subcategory
    if category_id is None:
        return None, None
    category = session.get(Category, category_id)
    if category is None or category.wedding_id != wedding.id or not can_see(category, account):
        raise unprocessable("Category not found")
    return category, None


@router.get("", response_model=list[ItemRead])
def list_items(
    wedding: WeddingDependency, session: SessionDependency, account: CurrentUser, category_id: int | None = None
) -> list[ItemRead]:
    statement = (
        select(Item)
        .where(Item.wedding_id == wedding.id, visible_item(account))
        .options(selectinload(Item.requirements))
        .order_by(Item.name, Item.id)
    )
    if category_id is not None:
        statement = statement.where(Item.category_id == category_id)
    return [to_read(item, account) for item in session.scalars(statement)]


@router.post("", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreate, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> ItemRead:
    fields = payload.model_dump()
    category, subcategory = resolve_tags(
        session, wedding, account, fields.pop("category_id"), fields.pop("subcategory_id")
    )
    item = Item(
        wedding_id=wedding.id, created_by_id=account_id(account), category=category, subcategory=subcategory, **fields
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_read(item, account)


@router.get("/{item_id}", response_model=ItemRead)
def read_item(item: ItemDependency, account: CurrentUser) -> ItemRead:
    return to_read(item, account)


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(
    payload: ItemUpdate,
    item: ItemDependency,
    wedding: WeddingDependency,
    session: SessionDependency,
    account: CurrentUser,
) -> ItemRead:
    changes = payload.model_dump(exclude_unset=True)
    if "is_private" in changes:
        change_privacy(item, changes.pop("is_private"), account)
    if "category_id" in changes or "subcategory_id" in changes:
        category_id = changes.pop("category_id", item.category_id)
        # A subcategory only survives a move if it still belongs to the item's category.
        kept_subcategory_id = item.subcategory_id if category_id == item.category_id else None
        subcategory_id = changes.pop("subcategory_id", kept_subcategory_id)
        item.category, item.subcategory = resolve_tags(session, wedding, account, category_id, subcategory_id)
    for field, value in changes.items():
        setattr(item, field, value)
    session.commit()
    session.refresh(item)
    return to_read(item, account)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item: ItemDependency, session: SessionDependency, storage: StorageDependency) -> None:
    """Its tasks and files go with it, the files out of the bucket too."""
    documents = list(item.documents)
    session.delete(item)
    session.commit()
    delete_files(storage, documents)
