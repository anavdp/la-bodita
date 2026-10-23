"""Private categories and items: seen only by the person who made them.

An item is hidden when it is private or when its category is, and its tasks are
hidden with it. Everything hidden answers 404, as if it were not there.
"""

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, false, or_, select

from app.models import Category, Item, UserAccount
from app.models.mixins import PrivacyMixin


def account_id(account: UserAccount | None) -> int | None:
    return account.id if account is not None else None


def visible(model: type[PrivacyMixin], account: UserAccount | None) -> ColumnElement[bool]:
    """Rows of `model` this account may see, as a query condition."""
    signed_in_id = account_id(account)
    # Comparing with None would turn into IS NULL and show every unclaimed private row.
    made_by_them = model.created_by_id == signed_in_id if signed_in_id is not None else false()
    return or_(model.is_private.is_(False), made_by_them)


def visible_item(account: UserAccount | None) -> ColumnElement[bool]:
    visible_categories = select(Category.id).where(visible(Category, account))
    return visible(Item, account) & or_(Item.category_id.is_(None), Item.category_id.in_(visible_categories))


def can_see(row: PrivacyMixin, account: UserAccount | None) -> bool:
    return not row.is_private or (row.created_by_id is not None and row.created_by_id == account_id(account))


def can_see_item(item: Item, account: UserAccount | None) -> bool:
    return can_see(item, account) and (item.category is None or can_see(item.category, account))


def is_mine(row: PrivacyMixin, account: UserAccount | None) -> bool:
    """Made by this account, or by no one yet (from before sign-in existed)."""
    return row.created_by_id is None or row.created_by_id == account_id(account)


def change_privacy(row: PrivacyMixin, is_private: bool, account: UserAccount | None) -> None:
    """Only the maker may hide a row, or share it again: hiding someone's own row
    from them would make it vanish for them. An unclaimed row becomes the
    hider's."""
    if is_private == row.is_private:
        return
    if not is_mine(row, account):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the person who made it can change who sees it")
    if row.created_by_id is None:
        row.created_by_id = account_id(account)
    row.is_private = is_private
