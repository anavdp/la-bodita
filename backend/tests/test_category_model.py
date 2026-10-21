from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, Subcategory, Wedding


def test_given_a_category_with_subcategories_when_it_is_saved_then_they_share_its_color(
    db_session: Session, wedding: Wedding
):
    vendors = Category(wedding_id=wedding.id, name="Vendors", emoji="🛍️", color="#f39237")
    vendors.subcategories = [
        Subcategory(wedding_id=wedding.id, name="Photographer", emoji="📸"),
        Subcategory(wedding_id=wedding.id, name="Cake", emoji="🎂"),
    ]

    db_session.add(vendors)
    db_session.commit()
    db_session.expire(vendors)

    assert [subcategory.name for subcategory in vendors.subcategories] == ["Cake", "Photographer"]
    assert {subcategory.color for subcategory in vendors.subcategories} == {"#f39237"}


def test_given_a_category_when_it_is_deleted_then_its_subcategories_go_with_it(
    db_session: Session, wedding: Wedding
):
    church = Category(wedding_id=wedding.id, name="Church", emoji="⛪", color="#7189ff")
    church.subcategories = [Subcategory(wedding_id=wedding.id, name="Ceremony", emoji="💍")]
    db_session.add(church)
    db_session.commit()

    db_session.delete(church)
    db_session.commit()

    assert db_session.scalars(select(Subcategory)).all() == []


def test_given_a_wedding_when_it_is_deleted_then_its_categories_go_with_it(db_session: Session, wedding: Wedding):
    db_session.add(Category(wedding_id=wedding.id, name="Church", emoji="⛪", color="#7189ff"))
    db_session.commit()

    db_session.delete(wedding)
    db_session.commit()

    assert db_session.scalars(select(Category)).all() == []
