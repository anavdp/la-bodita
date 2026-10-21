from sqlalchemy.orm import Session

from app.models import Category, Item, ItemStatus, Subcategory, Wedding


def a_category(db_session: Session, wedding: Wedding) -> Category:
    category = Category(wedding_id=wedding.id, name="Photographer", emoji="📸", color="#f39237")
    db_session.add(category)
    db_session.commit()
    return category


def test_given_a_new_vendor_when_it_is_saved_then_it_starts_as_an_idea(db_session: Session, wedding: Wedding):
    photographer = Item(
        wedding_id=wedding.id,
        name="Luz de Agua Foto",
        category=a_category(db_session, wedding),
        contact_name="Luz",
        phone="+58 412 000 0000",
        instagram_url="https://instagram.com/luzdeagua.foto",
    )

    db_session.add(photographer)
    db_session.commit()

    assert photographer.status == ItemStatus.IDEA
    assert photographer.category.name == "Photographer"
    assert photographer.website_url is None
    assert photographer.notes is None


def test_given_an_item_without_a_category_when_it_is_saved_then_it_is_kept_uncategorized(
    db_session: Session, wedding: Wedding
):
    item = Item(wedding_id=wedding.id, name="Something to sort out later")

    db_session.add(item)
    db_session.commit()

    assert item.category_id is None
    assert item.subcategory_id is None


def test_given_a_categorized_item_when_its_category_is_deleted_then_the_item_stays_uncategorized(
    db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    subcategory = Subcategory(wedding_id=wedding.id, category=category, name="Video", emoji="🎥")
    item = Item(wedding_id=wedding.id, name="Andrés Rivas Photo", category=category, subcategory=subcategory)
    db_session.add(item)
    db_session.commit()

    db_session.delete(category)
    db_session.commit()
    db_session.refresh(item)

    assert item.category_id is None
    assert item.subcategory_id is None


def test_given_a_vendor_when_its_status_moves_on_then_the_new_status_is_stored(
    db_session: Session, wedding: Wedding
):
    item = Item(wedding_id=wedding.id, name="Dulce Rosa Pastelería")
    db_session.add(item)
    db_session.commit()

    item.status = ItemStatus.MEETING_SET
    db_session.commit()
    db_session.expire(item)

    assert item.status == ItemStatus.MEETING_SET
