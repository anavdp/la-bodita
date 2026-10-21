from datetime import date, time

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, Item, Requirement, Wedding

REQUIREMENTS_URL = "/api/weddings/{wedding_id}/requirements"


def an_item(db_session: Session, wedding: Wedding, name: str = "Iglesia de Araure", category: Category | None = None) -> Item:
    item = Item(wedding_id=wedding.id, name=name, category=category)
    db_session.add(item)
    db_session.commit()
    return item


def a_task(db_session: Session, wedding: Wedding, title: str, **fields) -> Requirement:
    task = Requirement(wedding_id=wedding.id, title=title, **fields)
    db_session.add(task)
    db_session.commit()
    return task


def test_given_tasks_when_they_are_listed_then_dated_ones_come_first_by_date_and_time(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_task(db_session, wedding, "Ask if the choir is included")
    a_task(db_session, wedding, "Cake tasting", due_date=date(2026, 10, 31), due_time=time(11, 0))
    a_task(db_session, wedding, "Bring the certificates", due_date=date(2026, 10, 23))
    a_task(db_session, wedding, "Send the Pinterest board", due_date=date(2026, 10, 31), due_time=time(9, 0))

    response = client.get(REQUIREMENTS_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    assert [task["title"] for task in response.json()] == [
        "Bring the certificates",
        "Send the Pinterest board",
        "Cake tasting",
        "Ask if the choir is included",
    ]


def test_given_a_task_for_an_item_when_it_is_listed_then_it_names_the_item_and_its_category(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = Category(wedding_id=wedding.id, name="Church", emoji="⛪", color="#7189ff")
    item = an_item(db_session, wedding, category=church)
    a_task(db_session, wedding, "Bring the certificates", item=item)

    response = client.get(REQUIREMENTS_URL.format(wedding_id=wedding.id))

    task = response.json()[0]
    assert task["item_id"] == item.id
    assert task["item_name"] == "Iglesia de Araure"
    assert task["category_id"] == church.id
    assert task["is_done"] is False


def test_given_tasks_when_filtered_by_item_then_only_that_items_tasks_are_listed(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    cake = an_item(db_session, wedding, name="Dulce Rosa")
    a_task(db_session, wedding, "Bring the certificates", item=church)
    a_task(db_session, wedding, "Cake tasting", item=cake)

    response = client.get(REQUIREMENTS_URL.format(wedding_id=wedding.id), params={"item_id": cake.id})

    assert [task["title"] for task in response.json()] == ["Cake tasting"]


def test_given_tasks_when_filtered_by_category_then_only_tasks_of_its_items_are_listed(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = Category(wedding_id=wedding.id, name="Church", color="#7189ff")
    a_task(db_session, wedding, "Bring the certificates", item=an_item(db_session, wedding, category=church))
    a_task(db_session, wedding, "Pick the wedding colors")

    response = client.get(REQUIREMENTS_URL.format(wedding_id=wedding.id), params={"category_id": church.id})

    assert [task["title"] for task in response.json()] == ["Bring the certificates"]


def test_given_open_and_done_tasks_when_filtered_by_done_then_only_those_are_listed(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_task(db_session, wedding, "Ask about free Saturdays", is_done=True)
    a_task(db_session, wedding, "Bring the certificates")

    response = client.get(REQUIREMENTS_URL.format(wedding_id=wedding.id), params={"is_done": False})

    assert [task["title"] for task in response.json()] == ["Bring the certificates"]


def test_given_another_weddings_tasks_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    a_task(db_session, other_wedding, "Not ours")

    response = client.get(REQUIREMENTS_URL.format(wedding_id=wedding.id))

    assert response.json() == []


def test_given_an_appointment_when_it_is_created_for_an_item_then_it_is_saved_open(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding, name="Dulce Rosa")

    response = client.post(
        REQUIREMENTS_URL.format(wedding_id=wedding.id),
        json={"title": "Cake tasting", "item_id": item.id, "due_date": "2026-10-31", "due_time": "11:00"},
    )

    assert response.status_code == 201
    assert response.json()["is_done"] is False
    assert response.json()["item_name"] == "Dulce Rosa"
    assert response.json()["due_time"] == "11:00:00"
    assert db_session.scalars(select(Requirement.title)).all() == ["Cake tasting"]


def test_given_a_time_without_a_date_when_a_task_is_created_then_it_is_rejected(client: TestClient, wedding: Wedding):
    response = client.post(REQUIREMENTS_URL.format(wedding_id=wedding.id), json={"title": "Call", "due_time": "11:00"})

    assert response.status_code == 422


def test_given_another_weddings_item_when_a_task_is_created_for_it_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = an_item(db_session, other_wedding)

    response = client.post(REQUIREMENTS_URL.format(wedding_id=wedding.id), json={"title": "Hijack", "item_id": foreign.id})

    assert response.status_code == 422


def test_given_an_open_task_when_it_is_ticked_off_then_it_is_done(
    client: TestClient, db_session: Session, wedding: Wedding
):
    task = a_task(db_session, wedding, "Bring the certificates", due_date=date(2026, 10, 23))

    response = client.patch(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{task.id}", json={"is_done": True})

    assert response.status_code == 200
    assert response.json()["is_done"] is True
    assert response.json()["due_date"] == "2026-10-23"


def test_given_an_appointment_when_its_date_is_cleared_then_its_time_goes_too(
    client: TestClient, db_session: Session, wedding: Wedding
):
    task = a_task(db_session, wedding, "Cake tasting", due_date=date(2026, 10, 31), due_time=time(11, 0))

    response = client.patch(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{task.id}", json={"due_date": None})

    assert (response.json()["due_date"], response.json()["due_time"]) == (None, None)


def test_given_an_undated_task_when_only_a_time_is_set_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    task = a_task(db_session, wedding, "Call the florist")

    response = client.patch(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{task.id}", json={"due_time": "10:00"})

    assert response.status_code == 422


def test_given_a_task_when_it_moves_to_another_item_then_it_is_listed_there(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    cake = an_item(db_session, wedding, name="Dulce Rosa")
    task = a_task(db_session, wedding, "Ask for a quote", item=church)

    response = client.patch(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{task.id}", json={"item_id": cake.id})

    assert response.json()["item_name"] == "Dulce Rosa"


def test_given_a_task_when_its_title_is_blanked_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    task = a_task(db_session, wedding, "Call the florist")

    response = client.patch(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{task.id}", json={"title": None})

    assert response.status_code == 422


def test_given_a_task_when_it_is_deleted_then_it_is_gone(client: TestClient, db_session: Session, wedding: Wedding):
    task = a_task(db_session, wedding, "Call the florist")

    response = client.delete(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{task.id}")

    assert response.status_code == 204
    assert db_session.scalars(select(Requirement)).all() == []


def test_given_another_weddings_task_when_it_is_changed_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = a_task(db_session, other_wedding, "Not ours")

    response = client.patch(f"{REQUIREMENTS_URL.format(wedding_id=wedding.id)}/{foreign.id}", json={"is_done": True})

    assert response.status_code == 404
