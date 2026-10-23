"""Private categories and items: only the person who made them sees them.

Everything else (guests, budget, the shared categories and items) is seen by
both. An item in a private category is as private as the category, and so are
its checklist tasks: hiding "Wedding dress" must also hide "Dress fitting".
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth import SESSION_COOKIE, start_session
from app.database import get_session
from app.main import app
from app.models import Category, Item, Requirement, UserAccount, Wedding

BASE_URL = "http://testserver"


@pytest.fixture
def accounts(db_session: Session, wedding: Wedding) -> dict[str, UserAccount]:
    vicky = UserAccount(wedding_id=wedding.id, email="vicky@example.com", display_name="Vicky")
    gerardo = UserAccount(wedding_id=wedding.id, email="gerardo@example.com", display_name="Gerardo")
    db_session.add_all([vicky, gerardo])
    db_session.commit()
    return {"vicky": vicky, "gerardo": gerardo}


@pytest.fixture
def clients(db_session: Session, accounts: dict[str, UserAccount]) -> Generator[dict[str, TestClient], None, None]:
    """One browser each, signed in as its owner."""
    app.dependency_overrides[get_session] = lambda: db_session
    signed_in = {}
    for name, account in accounts.items():
        client = TestClient(app, base_url=BASE_URL)
        client.cookies.set(SESSION_COOKIE, start_session(db_session, account))
        signed_in[name] = client
    yield signed_in
    app.dependency_overrides.clear()


@pytest.fixture
def vicky(clients: dict[str, TestClient]) -> TestClient:
    return clients["vicky"]


@pytest.fixture
def gerardo(clients: dict[str, TestClient]) -> TestClient:
    return clients["gerardo"]


def url(wedding: Wedding, path: str) -> str:
    return f"/api/weddings/{wedding.id}/{path}"


def create_category(client: TestClient, wedding: Wedding, name: str, is_private: bool = False) -> dict:
    response = client.post(url(wedding, "categories"), json={"name": name, "color": "#ddcefa", "is_private": is_private})
    assert response.status_code == 201
    return response.json()


def create_item(client: TestClient, wedding: Wedding, name: str, **fields) -> dict:
    response = client.post(url(wedding, "items"), json={"name": name, **fields})
    assert response.status_code == 201
    return response.json()


def names(response) -> list[str]:
    return [row["name"] for row in response.json()]


def test_given_a_private_category_when_the_other_user_lists_categories_then_it_is_not_there(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    create_category(vicky, wedding, "Wedding dress", is_private=True)
    create_category(vicky, wedding, "Church")

    assert names(gerardo.get(url(wedding, "categories"))) == ["Church"]
    assert names(vicky.get(url(wedding, "categories"))) == ["Church", "Wedding dress"]


def test_given_a_new_category_when_it_is_created_then_it_says_who_may_see_it(vicky: TestClient, wedding: Wedding):
    category = create_category(vicky, wedding, "Despedida de soltera", is_private=True)

    assert category["is_private"] is True
    assert category["is_mine"] is True


def test_given_a_shared_category_made_by_the_other_user_when_it_is_listed_then_it_is_not_theirs(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    create_category(vicky, wedding, "Church")

    assert gerardo.get(url(wedding, "categories")).json()[0]["is_mine"] is False


def test_given_a_category_made_before_sign_in_existed_when_it_is_listed_then_either_user_may_claim_it(
    gerardo: TestClient, db_session: Session, wedding: Wedding
):
    db_session.add(Category(wedding_id=wedding.id, name="Flowers", color="#ddcefa"))
    db_session.commit()

    category = gerardo.get(url(wedding, "categories")).json()[0]
    assert category["is_private"] is False
    assert category["is_mine"] is True


@pytest.mark.parametrize("method", ["get_items", "patch", "delete", "add_subcategory"])
def test_given_a_private_category_when_the_other_user_reaches_for_it_then_it_is_not_found(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding, method: str
):
    category = create_category(vicky, wedding, "Wedding dress", is_private=True)
    category_url = url(wedding, f"categories/{category['id']}")

    if method == "get_items":
        response = gerardo.post(url(wedding, "items"), json={"name": "Peek", "category_id": category["id"]})
        assert response.status_code == 422
        return
    if method == "patch":
        response = gerardo.patch(category_url, json={"name": "Peek"})
    elif method == "delete":
        response = gerardo.delete(category_url)
    else:
        response = gerardo.post(f"{category_url}/subcategories", json={"name": "Veil"})

    assert response.status_code == 404


def test_given_her_own_shared_category_when_she_makes_it_private_then_the_other_user_loses_sight_of_it(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    category = create_category(vicky, wedding, "Wedding dress")

    response = vicky.patch(url(wedding, f"categories/{category['id']}"), json={"is_private": True})

    assert response.status_code == 200
    assert gerardo.get(url(wedding, "categories")).json() == []


def test_given_a_shared_category_made_by_the_other_user_when_he_tries_to_make_it_private_then_it_is_refused(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    """Hiding something from the person who made it would make it vanish for them."""
    category = create_category(vicky, wedding, "Church")

    response = gerardo.patch(url(wedding, f"categories/{category['id']}"), json={"is_private": True})

    assert response.status_code == 403
    assert names(vicky.get(url(wedding, "categories"))) == ["Church"]


def test_given_a_shared_category_made_by_the_other_user_when_he_renames_it_then_that_is_fine(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    category = create_category(vicky, wedding, "Church")

    response = gerardo.patch(url(wedding, f"categories/{category['id']}"), json={"name": "Iglesia", "is_private": False})

    assert response.status_code == 200
    assert response.json()["name"] == "Iglesia"


def test_given_an_unclaimed_category_when_someone_makes_it_private_then_it_becomes_theirs(
    vicky: TestClient, gerardo: TestClient, db_session: Session, wedding: Wedding
):
    category = Category(wedding_id=wedding.id, name="Wedding dress", color="#ddcefa")
    db_session.add(category)
    db_session.commit()

    vicky.patch(url(wedding, f"categories/{category.id}"), json={"is_private": True})

    assert names(vicky.get(url(wedding, "categories"))) == ["Wedding dress"]
    assert gerardo.get(url(wedding, "categories")).json() == []


def test_given_a_private_item_when_the_other_user_lists_items_then_it_is_not_there(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    create_item(vicky, wedding, "Atelier Novias", is_private=True)
    create_item(vicky, wedding, "Iglesia de Araure")

    assert names(gerardo.get(url(wedding, "items"))) == ["Iglesia de Araure"]
    assert names(vicky.get(url(wedding, "items"))) == ["Atelier Novias", "Iglesia de Araure"]


def test_given_a_shared_item_in_a_private_category_when_the_other_user_lists_items_then_it_is_hidden_too(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    dress = create_category(vicky, wedding, "Wedding dress", is_private=True)
    create_item(vicky, wedding, "Atelier Novias", category_id=dress["id"])

    assert gerardo.get(url(wedding, "items")).json() == []


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_given_a_hidden_item_when_the_other_user_opens_it_by_id_then_it_is_not_found(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding, method: str
):
    item = create_item(vicky, wedding, "Atelier Novias", is_private=True)
    item_url = url(wedding, f"items/{item['id']}")

    response = {"get": gerardo.get, "delete": gerardo.delete}.get(method, lambda u: gerardo.patch(u, json={"name": "x"}))(
        item_url
    )

    assert response.status_code == 404


def test_given_a_shared_item_made_by_the_other_user_when_he_tries_to_make_it_private_then_it_is_refused(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    item = create_item(vicky, wedding, "Iglesia de Araure")

    response = gerardo.patch(url(wedding, f"items/{item['id']}"), json={"is_private": True})

    assert response.status_code == 403


def test_given_tasks_under_a_hidden_item_when_the_other_user_opens_the_checklist_then_they_are_hidden(
    vicky: TestClient, gerardo: TestClient, db_session: Session, wedding: Wedding
):
    dress = create_item(vicky, wedding, "Atelier Novias", is_private=True)
    church = create_item(vicky, wedding, "Iglesia de Araure")
    vicky.post(url(wedding, "requirements"), json={"title": "Dress fitting", "item_id": dress["id"]})
    vicky.post(url(wedding, "requirements"), json={"title": "Baptism certificate", "item_id": church["id"]})
    vicky.post(url(wedding, "requirements"), json={"title": "Book flights"})

    titles = [task["title"] for task in gerardo.get(url(wedding, "requirements")).json()]

    assert titles == ["Baptism certificate", "Book flights"]
    assert len(vicky.get(url(wedding, "requirements")).json()) == 3


def test_given_a_task_under_a_hidden_item_when_the_other_user_opens_it_by_id_then_it_is_not_found(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    dress = create_item(vicky, wedding, "Atelier Novias", is_private=True)
    task = vicky.post(url(wedding, "requirements"), json={"title": "Dress fitting", "item_id": dress["id"]}).json()

    response = gerardo.patch(url(wedding, f"requirements/{task['id']}"), json={"is_done": True})

    assert response.status_code == 404


def test_given_a_hidden_item_when_the_other_user_files_a_task_under_it_then_it_is_refused(
    vicky: TestClient, gerardo: TestClient, wedding: Wedding
):
    dress = create_item(vicky, wedding, "Atelier Novias", is_private=True)

    response = gerardo.post(url(wedding, "requirements"), json={"title": "Peek", "item_id": dress["id"]})

    assert response.status_code == 422


def test_given_a_user_removed_from_the_list_when_their_private_rows_remain_then_no_one_else_sees_them(
    vicky: TestClient, gerardo: TestClient, db_session: Session, accounts: dict[str, UserAccount], wedding: Wedding
):
    """Their rows outlive them as unclaimed, not as suddenly public."""
    create_item(vicky, wedding, "Atelier Novias", is_private=True)

    db_session.delete(accounts["vicky"])
    db_session.commit()
    db_session.expire_all()

    assert gerardo.get(url(wedding, "items")).json() == []
    stored = db_session.query(Item).one()
    assert stored.created_by_id is None and stored.is_private is True
    assert db_session.query(Requirement).all() == []
