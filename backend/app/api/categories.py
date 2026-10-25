from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.guests import SessionDependency, WeddingDependency
from app.auth import CurrentUser
from app.models import Category, Subcategory
from app.privacy import account_id, can_see, change_privacy, is_mine, visible
from app.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    SubcategoryCreate,
    SubcategoryRead,
    SubcategoryUpdate,
)

router = APIRouter(prefix="/api/weddings/{wedding_id}/categories", tags=["categories"])


def to_read(category: Category, account: CurrentUser) -> CategoryRead:
    read = CategoryRead.model_validate(category)
    read.is_mine = is_mine(category, account)
    return read


def get_scoped_category(
    category_id: int, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> Category:
    """Someone else's private category answers 404, like one that does not exist."""
    category = session.get(Category, category_id)
    if category is None or category.wedding_id != wedding.id or not can_see(category, account):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


CategoryDependency = Annotated[Category, Depends(get_scoped_category)]


def get_scoped_subcategory(
    subcategory_id: int, category: CategoryDependency, session: SessionDependency
) -> Subcategory:
    """A subcategory is only reachable through the category it belongs to."""
    subcategory = session.get(Subcategory, subcategory_id)
    if subcategory is None or subcategory.category_id != category.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subcategory not found")
    return subcategory


SubcategoryDependency = Annotated[Subcategory, Depends(get_scoped_subcategory)]


@router.get("", response_model=list[CategoryRead])
def list_categories(
    wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> list[CategoryRead]:
    statement = (
        select(Category)
        .where(Category.wedding_id == wedding.id, visible(Category, account))
        .options(selectinload(Category.subcategories))
        .order_by(Category.name, Category.id)
    )
    return [to_read(category, account) for category in session.scalars(statement)]


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate, wedding: WeddingDependency, session: SessionDependency, account: CurrentUser
) -> CategoryRead:
    category = Category(wedding_id=wedding.id, created_by_id=account_id(account), **payload.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)
    return to_read(category, account)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    payload: CategoryUpdate, category: CategoryDependency, session: SessionDependency, account: CurrentUser
) -> CategoryRead:
    changes = payload.model_dump(exclude_unset=True)
    if "is_private" in changes:
        change_privacy(category, changes.pop("is_private"), account)
    for field, value in changes.items():
        setattr(category, field, value)
    session.commit()
    session.refresh(category)
    return to_read(category, account)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category: CategoryDependency, session: SessionDependency) -> None:
    """Its subcategories go too; items tagged with it stay, uncategorized."""
    session.delete(category)
    session.commit()


@router.post("/{category_id}/subcategories", response_model=SubcategoryRead, status_code=status.HTTP_201_CREATED)
def create_subcategory(
    payload: SubcategoryCreate, category: CategoryDependency, session: SessionDependency
) -> Subcategory:
    subcategory = Subcategory(wedding_id=category.wedding_id, category=category, **payload.model_dump())
    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)
    return subcategory


@router.patch("/{category_id}/subcategories/{subcategory_id}", response_model=SubcategoryRead)
def update_subcategory(
    payload: SubcategoryUpdate, subcategory: SubcategoryDependency, session: SessionDependency
) -> Subcategory:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(subcategory, field, value)
    session.commit()
    session.refresh(subcategory)
    return subcategory


@router.delete("/{category_id}/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subcategory(subcategory: SubcategoryDependency, session: SessionDependency) -> None:
    session.delete(subcategory)
    session.commit()
