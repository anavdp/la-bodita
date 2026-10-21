from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, Item, Subcategory, Wedding

CATEGORIES_URL = "/api/weddings/{wedding_id}/categories"


def a_category(db_session: Session, wedding: Wedding, name: str = "Photographer", color: str = "#f39237") -> Category:
    category = Category(wedding_id=wedding.id, name=name, emoji="📸", color=color)
    db_session.add(category)
    db_session.commit()
    return category


def test_given_categories_when_they_are_listed_then_each_comes_with_its_subcategories_in_its_color(
    client: TestClient, db_session: Session, wedding: Wedding
):
    vendors = a_category(db_session, wedding, name="Vendors")
    vendors.subcategories.append(Subcategory(wedding_id=wedding.id, name="Cake", emoji="🎂"))
    a_category(db_session, wedding, name="Church", color="#7189ff")
    db_session.commit()

    response = client.get(CATEGORIES_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    categories = response.json()
    assert [category["name"] for category in categories] == ["Church", "Vendors"]
    assert categories[1]["subcategories"] == [
        {"id": vendors.subcategories[0].id, "category_id": vendors.id, "name": "Cake", "emoji": "🎂", "color": "#f39237"}
    ]


def test_given_another_weddings_categories_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    a_category(db_session, other_wedding)

    response = client.get(CATEGORIES_URL.format(wedding_id=wedding.id))

    assert response.json() == []


def test_given_a_name_emoji_and_color_when_a_category_is_created_then_it_is_saved(
    client: TestClient, db_session: Session, wedding: Wedding
):
    response = client.post(
        CATEGORIES_URL.format(wedding_id=wedding.id), json={"name": " Church ", "emoji": "⛪", "color": "#7189FF"}
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Church"
    assert response.json()["color"] == "#7189ff"
    assert response.json()["subcategories"] == []
    assert db_session.scalars(select(Category.name)).all() == ["Church"]


def test_given_a_color_that_is_not_a_hex_code_when_a_category_is_created_then_it_is_rejected(
    client: TestClient, wedding: Wedding
):
    response = client.post(CATEGORIES_URL.format(wedding_id=wedding.id), json={"name": "Church", "color": "blue"})

    assert response.status_code == 422


def test_given_a_category_when_it_is_renamed_then_only_the_name_changes(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)

    response = client.patch(
        f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}", json={"name": "Photo & video"}
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Photo & video"
    assert response.json()["emoji"] == "📸"
    assert response.json()["color"] == "#f39237"


def test_given_a_category_when_its_emoji_is_cleared_then_it_has_none(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)

    response = client.patch(f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}", json={"emoji": None})

    assert response.json()["emoji"] is None


def test_given_a_category_when_its_name_is_blanked_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)

    response = client.patch(f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}", json={"name": None})

    assert response.status_code == 422


def test_given_a_category_with_items_when_it_is_deleted_then_the_items_stay_uncategorized(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    item = Item(wedding_id=wedding.id, name="Luz de Agua Foto", category=category)
    db_session.add(item)
    db_session.commit()

    response = client.delete(f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}")

    assert response.status_code == 204
    db_session.refresh(item)
    assert item.category_id is None


def test_given_another_weddings_category_when_it_is_changed_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = a_category(db_session, other_wedding)

    response = client.patch(f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{foreign.id}", json={"name": "Mine"})

    assert response.status_code == 404


def test_given_a_category_when_a_subcategory_is_added_then_it_takes_the_category_color(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)

    response = client.post(
        f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}/subcategories",
        json={"name": "Video", "emoji": "🎥"},
    )

    assert response.status_code == 201
    assert response.json()["color"] == "#f39237"
    assert response.json()["category_id"] == category.id


def test_given_a_subcategory_when_it_is_renamed_then_the_new_name_is_saved(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    subcategory = Subcategory(wedding_id=wedding.id, category=category, name="Video", emoji="🎥")
    db_session.add(subcategory)
    db_session.commit()

    response = client.patch(
        f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}/subcategories/{subcategory.id}",
        json={"name": "Drone"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Drone"
    assert response.json()["emoji"] == "🎥"


def test_given_a_subcategory_when_it_is_deleted_then_it_is_gone(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    subcategory = Subcategory(wedding_id=wedding.id, category=category, name="Video")
    db_session.add(subcategory)
    db_session.commit()

    response = client.delete(
        f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{category.id}/subcategories/{subcategory.id}"
    )

    assert response.status_code == 204
    assert db_session.scalars(select(Subcategory)).all() == []


def test_given_a_subcategory_of_another_category_when_it_is_changed_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    photographer = a_category(db_session, wedding)
    church = a_category(db_session, wedding, name="Church")
    subcategory = Subcategory(wedding_id=wedding.id, category=church, name="Ceremony")
    db_session.add(subcategory)
    db_session.commit()

    response = client.patch(
        f"{CATEGORIES_URL.format(wedding_id=wedding.id)}/{photographer.id}/subcategories/{subcategory.id}",
        json={"name": "Moved"},
    )

    assert response.status_code == 404
