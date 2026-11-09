"""Sharing files from the phone's share menu (#43).

An iPhone web app can't sit in the share menu, so an iOS Shortcut does: it shows
the list of items and sends the files here with a personal
phone key instead of the browser's sign-in cookie.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.documents import get_document_storage
from app.auth import SESSION_COOKIE, hash_token, start_session
from app.database import get_session
from app.main import app
from app.models import Category, Document, DocumentKind, Item, Requirement, UserAccount, Wedding
from app.storage import DocumentStorage
from tests.fakes import FakeBucket

JPEG = b"\xff\xd8\xff\xe0 a quote from the florist"
PDF = b"%PDF-1.7 a quote"


@pytest.fixture
def bucket() -> FakeBucket:
    return FakeBucket()


@pytest.fixture
def phone(db_session: Session, bucket: FakeBucket) -> Generator[TestClient, None, None]:
    """The API with nothing stood in for but the database and the bucket."""
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_document_storage] = lambda: DocumentStorage(bucket)
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def vicky(db_session: Session, wedding: Wedding) -> UserAccount:
    account = UserAccount(wedding_id=wedding.id, email="vicky@example.com", display_name="Vicky")
    db_session.add(account)
    db_session.commit()
    return account


def signed_in(client: TestClient, db_session: Session, account: UserAccount) -> TestClient:
    client.cookies.set(SESSION_COOKIE, start_session(db_session, account))
    return client


def new_key(client: TestClient, db_session: Session, account: UserAccount) -> str:
    key = signed_in(client, db_session, account).post("/api/auth/phone-key").json()["key"]
    client.cookies.clear()
    return key


def bearer(key: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def add(db_session: Session, *rows):
    db_session.add_all(rows)
    db_session.commit()
    return rows


# The phone key


def test_given_a_signed_in_user_when_they_make_a_phone_key_then_it_comes_back_once_and_only_its_hash_is_kept(
    phone: TestClient, db_session: Session, vicky: UserAccount
):
    response = signed_in(phone, db_session, vicky).post("/api/auth/phone-key")

    assert response.status_code == 201
    key = response.json()["key"]
    assert len(key) >= 40
    db_session.refresh(vicky)
    assert vicky.phone_key_hash == hash_token(key)
    assert phone.get("/api/auth/phone-key").json()["created_at"] is not None
    assert "key" not in phone.get("/api/auth/phone-key").json()


def test_given_no_phone_key_when_it_is_asked_about_then_it_says_there_is_none(
    phone: TestClient, db_session: Session, vicky: UserAccount
):
    assert signed_in(phone, db_session, vicky).get("/api/auth/phone-key").json() == {"created_at": None}


def test_given_a_phone_key_when_a_new_one_is_made_then_the_old_one_stops_working(
    phone: TestClient, db_session: Session, vicky: UserAccount
):
    old = new_key(phone, db_session, vicky)
    new = new_key(phone, db_session, vicky)

    assert phone.get("/api/share/items", headers=bearer(old)).status_code == 401
    assert phone.get("/api/share/items", headers=bearer(new)).status_code == 200


def test_given_a_phone_key_when_it_is_removed_then_it_stops_working(
    phone: TestClient, db_session: Session, vicky: UserAccount
):
    key = new_key(phone, db_session, vicky)

    assert signed_in(phone, db_session, vicky).delete("/api/auth/phone-key").status_code == 204
    phone.cookies.clear()

    assert phone.get("/api/share/items", headers=bearer(key)).status_code == 401


def test_given_no_sign_in_when_a_phone_key_is_asked_for_then_it_answers_401(phone: TestClient):
    assert phone.post("/api/auth/phone-key").status_code == 401
    assert phone.get("/api/auth/phone-key").status_code == 401


@pytest.mark.parametrize("header", [None, "Bearer guessed", "Basic dmlja3k6cGFzcw==", "Bearer "])
def test_given_no_valid_phone_key_when_sharing_is_used_then_it_answers_401(
    phone: TestClient, vicky: UserAccount, header: str | None
):
    headers = {"Authorization": header} if header else {}

    assert phone.get("/api/share/items", headers=headers).status_code == 401
    assert phone.post("/api/share", files={"file": ("a.jpg", JPEG, "image/jpeg")}, headers=headers).status_code == 401


def test_given_a_phone_key_when_the_planner_is_used_with_it_then_it_does_not_open_the_rest_of_the_planner(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    """The key only shares files: losing the phone must not give away the guest list."""
    key = new_key(phone, db_session, vicky)

    assert phone.get(f"/api/weddings/{wedding.id}/guests", headers=bearer(key)).status_code == 401


# Where does this go?


def test_given_items_when_the_phone_asks_where_files_can_go_then_it_gets_labels_grouped_by_category(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    flowers = Category(wedding_id=wedding.id, name="Flowers", emoji="💐", color="#e7a")
    venue = Category(wedding_id=wedding.id, name="Venue", emoji="🏛️", color="#7b7")
    add(
        db_session,
        Item(wedding_id=wedding.id, name="Hacienda La Vega", category=venue),
        Item(wedding_id=wedding.id, name="Floristería Ana", category=flowers),
        Item(wedding_id=wedding.id, name="Casa Blanca", category=venue),
        Item(wedding_id=wedding.id, name="Honeymoon ideas"),
    )
    key = new_key(phone, db_session, vicky)

    response = phone.get("/api/share/items", headers=bearer(key))

    assert response.status_code == 200
    assert response.json() == [
        "No item · just ours",
        "💐 Floristería Ana",
        "🏛️ Casa Blanca",
        "🏛️ Hacienda La Vega",
        "Honeymoon ideas",
    ]


def test_given_two_items_with_the_same_label_when_listed_then_each_label_is_still_one_of_a_kind(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    add(db_session, Item(wedding_id=wedding.id, name="Hotel"), Item(wedding_id=wedding.id, name="Hotel"))
    key = new_key(phone, db_session, vicky)

    assert phone.get("/api/share/items", headers=bearer(key)).json() == ["No item · just ours", "Hotel", "Hotel (2)"]


def test_given_someone_elses_private_item_when_the_phone_lists_items_then_it_is_left_out(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    gerardo = UserAccount(wedding_id=wedding.id, email="gerardo@example.com", display_name="Gerardo")
    add(db_session, gerardo)
    add(db_session, Item(wedding_id=wedding.id, name="Ring", is_private=True, created_by_id=gerardo.id))
    key = new_key(phone, db_session, vicky)

    assert phone.get("/api/share/items", headers=bearer(key)).json() == ["No item · just ours"]


def test_given_an_item_with_tasks_when_the_phone_lists_items_then_only_the_item_shows(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    """One question only: a file is moved onto a task later, in the planner."""
    (florist,) = add(db_session, Item(wedding_id=wedding.id, name="Floristería Ana"))
    add(db_session, Requirement(wedding_id=wedding.id, item_id=florist.id, title="Get a quote"))
    key = new_key(phone, db_session, vicky)

    assert phone.get("/api/share/items", headers=bearer(key)).json() == ["No item · just ours", "Floristería Ana"]


# Saving


def test_given_a_shared_photo_when_it_is_sent_for_an_item_then_it_lands_on_that_item(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount, bucket: FakeBucket
):
    (florist,) = add(db_session, Item(wedding_id=wedding.id, name="Floristería Ana"))
    key = new_key(phone, db_session, vicky)

    response = phone.post(
        "/api/share",
        files={"file": ("IMG_2210.jpg", JPEG, "image/jpeg")},
        data={"item": "Floristería Ana"},
        headers=bearer(key),
    )

    assert response.status_code == 201
    assert response.json() == {"message": "Saved to Floristería Ana"}
    document = db_session.scalars(select(Document)).one()
    assert (document.item_id, document.requirement_id, document.title) == (florist.id, None, "IMG_2210")
    assert document.kind == DocumentKind.PHOTO
    assert document.uploaded_by_id == vicky.id
    assert bucket.objects[document.storage_key] == (JPEG, "image/jpeg")


def test_given_several_files_shared_at_once_when_saved_then_all_of_them_land_on_the_item(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    (florist,) = add(db_session, Item(wedding_id=wedding.id, name="Floristería Ana"))
    key = new_key(phone, db_session, vicky)

    response = phone.post(
        "/api/share",
        files=[("file", ("one.jpg", JPEG, "image/jpeg")), ("file", ("quote.pdf", PDF, "application/pdf"))],
        data={"item": "Floristería Ana"},
        headers=bearer(key),
    )

    assert response.json() == {"message": "Saved 2 files to Floristería Ana"}
    documents = db_session.scalars(select(Document).order_by(Document.id)).all()
    assert [(d.title, d.kind, d.item_id) for d in documents] == [
        ("one", DocumentKind.PHOTO, florist.id),
        ("quote", DocumentKind.PAPER, florist.id),
    ]


def test_given_no_item_when_a_file_is_shared_then_it_is_kept_as_just_ours(
    phone: TestClient, db_session: Session, vicky: UserAccount
):
    key = new_key(phone, db_session, vicky)

    response = phone.post(
        "/api/share",
        files={"file": ("passport.pdf", PDF, "application/pdf")},
        data={"item": "No item · just ours"},
        headers=bearer(key),
    )

    assert response.json() == {"message": "Saved to Documents"}
    assert db_session.scalars(select(Document)).one().item_id is None


def test_given_a_file_without_a_type_when_shared_then_its_type_comes_from_its_name(
    phone: TestClient, db_session: Session, vicky: UserAccount, bucket: FakeBucket
):
    """A Shortcut can send a file as plain bytes; its name still says what it is."""
    key = new_key(phone, db_session, vicky)

    phone.post(
        "/api/share", files={"file": ("quote.PDF", PDF, "application/octet-stream")}, headers=bearer(key)
    )

    document = db_session.scalars(select(Document)).one()
    assert (document.content_type, document.kind) == ("application/pdf", DocumentKind.PAPER)
    assert bucket.objects[document.storage_key][1] == "application/pdf"


def test_given_a_file_the_planner_cannot_show_when_shared_then_nothing_is_saved(
    phone: TestClient, db_session: Session, vicky: UserAccount, bucket: FakeBucket
):
    key = new_key(phone, db_session, vicky)

    response = phone.post(
        "/api/share",
        files=[("file", ("one.jpg", JPEG, "image/jpeg")), ("file", ("page.html", b"<html>", "text/html"))],
        headers=bearer(key),
    )

    assert response.status_code == 415
    assert db_session.scalars(select(Document)).all() == []
    assert bucket.objects == {}


def test_given_an_unknown_label_when_a_file_is_shared_then_it_is_refused(
    phone: TestClient, db_session: Session, wedding: Wedding, vicky: UserAccount
):
    add(db_session, Item(wedding_id=wedding.id, name="Floristería Ana"))
    key = new_key(phone, db_session, vicky)

    response = phone.post(
        "/api/share",
        files={"file": ("a.jpg", JPEG, "image/jpeg")},
        data={"item": "Gone"},
        headers=bearer(key),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Item not found"


def test_given_a_file_sent_as_text_when_shared_then_it_says_the_shortcut_sends_the_wrong_thing(
    phone: TestClient, db_session: Session, vicky: UserAccount
):
    """A Shortcut repeating over the chosen label instead of the shared files sends text, not a file."""
    key = new_key(phone, db_session, vicky)

    response = phone.post("/api/share", data={"file": "💐 Floristería Ana"}, headers=bearer(key))

    assert response.status_code == 422
    assert "Shortcut Input" in response.json()["detail"]
