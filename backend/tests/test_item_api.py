from datetime import date, time

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, Item, ItemStatus, Requirement, Subcategory, Wedding

ITEMS_URL = "/api/weddings/{wedding_id}/items"


def a_category(db_session: Session, wedding: Wedding, name: str = "Photographer") -> Category:
    category = Category(wedding_id=wedding.id, name=name, emoji="📸", color="#f39237")
    db_session.add(category)
    db_session.commit()
    return category


def an_item(db_session: Session, wedding: Wedding, name: str = "Luz de Agua Foto", **fields) -> Item:
    item = Item(wedding_id=wedding.id, name=name, **fields)
    db_session.add(item)
    db_session.commit()
    return item


def test_given_items_when_they_are_listed_then_each_shows_its_vendor_details_sorted_by_name(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    an_item(db_session, wedding, name="Studio Caracola", category=category)
    an_item(
        db_session,
        wedding,
        name="Andrés Rivas Photo",
        category=category,
        status=ItemStatus.CONTACTED,
        instagram_url="https://instagram.com/andresrivas",
    )

    response = client.get(ITEMS_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    items = response.json()
    assert [item["name"] for item in items] == ["Andrés Rivas Photo", "Studio Caracola"]
    assert items[0]["status"] == "contacted"
    assert items[0]["category_id"] == category.id
    assert items[0]["instagram_url"] == "https://instagram.com/andresrivas"


def test_given_items_in_several_categories_when_filtered_by_one_then_only_its_items_are_listed(
    client: TestClient, db_session: Session, wedding: Wedding
):
    photographer = a_category(db_session, wedding)
    church = a_category(db_session, wedding, name="Church")
    an_item(db_session, wedding, name="Luz de Agua Foto", category=photographer)
    an_item(db_session, wedding, name="Iglesia de Araure", category=church)

    response = client.get(ITEMS_URL.format(wedding_id=wedding.id), params={"category_id": church.id})

    assert [item["name"] for item in response.json()] == ["Iglesia de Araure"]


def test_given_an_item_with_tasks_when_it_is_listed_then_it_shows_its_progress_and_next_dated_task(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding, name="Iglesia de Araure")
    church.requirements = [
        Requirement(wedding_id=wedding.id, title="Ask about free Saturdays", is_done=True, due_date=date(2026, 10, 10)),
        Requirement(wedding_id=wedding.id, title="Ask for the course dates", due_date=date(2026, 10, 30)),
        Requirement(
            wedding_id=wedding.id, title="Bring the certificates", due_date=date(2026, 10, 23), due_time=time(10, 0)
        ),
        Requirement(wedding_id=wedding.id, title="Ask if the choir is included"),
    ]
    db_session.commit()

    response = client.get(ITEMS_URL.format(wedding_id=wedding.id))

    item = response.json()[0]
    certificates = db_session.scalars(select(Requirement).where(Requirement.title == "Bring the certificates")).one()
    assert (item["task_count"], item["done_task_count"]) == (4, 1)
    assert item["next_task"] == {
        "id": certificates.id,
        "title": "Bring the certificates",
        "due_date": "2026-10-23",
        "due_time": "10:00:00",
    }


def test_given_an_item_without_dated_open_tasks_when_it_is_listed_then_it_has_no_next_task(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding)
    item.requirements = [Requirement(wedding_id=wedding.id, title="Ask for the portfolio")]
    db_session.commit()

    response = client.get(ITEMS_URL.format(wedding_id=wedding.id))

    assert response.json()[0]["next_task"] is None


def test_given_another_weddings_items_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    an_item(db_session, other_wedding)

    response = client.get(ITEMS_URL.format(wedding_id=wedding.id))

    assert response.json() == []


def test_given_vendor_details_when_an_item_is_created_then_it_is_saved_as_an_idea(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding, name="Cake")

    response = client.post(
        ITEMS_URL.format(wedding_id=wedding.id),
        json={
            "name": "Dulce Rosa Pastelería",
            "category_id": category.id,
            "contact_name": "Rosa",
            "phone": "+58 412 000 0000",
            "instagram_url": "https://instagram.com/dulcerosa",
            "notes": "Saw her cakes at Ana's wedding",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "idea"
    assert body["contact_name"] == "Rosa"
    assert (body["task_count"], body["done_task_count"], body["next_task"]) == (0, 0, None)
    assert db_session.scalars(select(Item.name)).all() == ["Dulce Rosa Pastelería"]


def test_given_only_a_subcategory_when_an_item_is_created_then_it_also_gets_the_parent_category(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    video = Subcategory(wedding_id=wedding.id, category=category, name="Video")
    db_session.add(video)
    db_session.commit()

    response = client.post(ITEMS_URL.format(wedding_id=wedding.id), json={"name": "Drone guy", "subcategory_id": video.id})

    assert response.json()["category_id"] == category.id
    assert response.json()["subcategory_id"] == video.id


def test_given_a_subcategory_of_another_category_when_an_item_is_created_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    photographer = a_category(db_session, wedding)
    church = a_category(db_session, wedding, name="Church")
    ceremony = Subcategory(wedding_id=wedding.id, category=church, name="Ceremony")
    db_session.add(ceremony)
    db_session.commit()

    response = client.post(
        ITEMS_URL.format(wedding_id=wedding.id),
        json={"name": "Mixed up", "category_id": photographer.id, "subcategory_id": ceremony.id},
    )

    assert response.status_code == 422


def test_given_another_weddings_category_when_an_item_is_created_with_it_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = a_category(db_session, other_wedding)

    response = client.post(ITEMS_URL.format(wedding_id=wedding.id), json={"name": "Hijack", "category_id": foreign.id})

    assert response.status_code == 422


def test_given_a_blank_name_when_an_item_is_created_then_it_is_rejected(client: TestClient, wedding: Wedding):
    response = client.post(ITEMS_URL.format(wedding_id=wedding.id), json={"name": "  "})

    assert response.status_code == 422


def test_given_an_item_when_it_is_read_then_its_details_come_back(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding, website_url="https://luzdeagua.example")

    response = client.get(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{item.id}")

    assert response.status_code == 200
    assert response.json()["website_url"] == "https://luzdeagua.example"


def test_given_a_vendor_when_its_status_changes_then_only_the_status_is_updated(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding, contact_name="Luz")

    response = client.patch(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{item.id}", json={"status": "meeting_set"})

    assert response.status_code == 200
    assert response.json()["status"] == "meeting_set"
    assert response.json()["contact_name"] == "Luz"


def test_given_a_categorized_item_when_its_category_is_cleared_then_its_subcategory_goes_too(
    client: TestClient, db_session: Session, wedding: Wedding
):
    category = a_category(db_session, wedding)
    video = Subcategory(wedding_id=wedding.id, category=category, name="Video")
    item = an_item(db_session, wedding, category=category, subcategory=video)

    response = client.patch(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{item.id}", json={"category_id": None})

    assert response.json()["category_id"] is None
    assert response.json()["subcategory_id"] is None


def test_given_an_item_when_it_moves_to_another_category_then_a_subcategory_from_the_old_one_is_dropped(
    client: TestClient, db_session: Session, wedding: Wedding
):
    photographer = a_category(db_session, wedding)
    church = a_category(db_session, wedding, name="Church")
    video = Subcategory(wedding_id=wedding.id, category=photographer, name="Video")
    item = an_item(db_session, wedding, category=photographer, subcategory=video)

    response = client.patch(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{item.id}", json={"category_id": church.id})

    assert response.json()["category_id"] == church.id
    assert response.json()["subcategory_id"] is None


def test_given_an_item_when_its_name_is_blanked_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding)

    response = client.patch(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{item.id}", json={"name": None})

    assert response.status_code == 422


def test_given_an_item_with_tasks_when_it_is_deleted_then_its_tasks_go_too(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding)
    item.requirements = [Requirement(wedding_id=wedding.id, title="Ask for a quote")]
    db_session.commit()

    response = client.delete(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{item.id}")

    assert response.status_code == 204
    assert db_session.scalars(select(Requirement)).all() == []


def test_given_another_weddings_item_when_it_is_read_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = an_item(db_session, other_wedding)

    response = client.get(f"{ITEMS_URL.format(wedding_id=wedding.id)}/{foreign.id}")

    assert response.status_code == 404
