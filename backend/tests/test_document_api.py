"""Uploading, listing, opening and deleting documents. The bucket is a fake: no test reaches Google."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.documents import MAX_UPLOAD_BYTES, get_document_storage
from app.main import app
from app.models import Category, Document, DocumentKind, Item, Requirement, UserAccount, Wedding
from app.storage import DocumentStorage
from tests.fakes import FakeBucket

DOCUMENTS_URL = "/api/weddings/{wedding_id}/documents"
JPEG = b"\xff\xd8\xff\xe0 a fitting photo"
PDF = b"%PDF-1.7 a certificate"


@pytest.fixture
def bucket(client: TestClient) -> FakeBucket:
    bucket = FakeBucket()
    app.dependency_overrides[get_document_storage] = lambda: DocumentStorage(bucket)
    return bucket


def url(wedding: Wedding, suffix: str = "") -> str:
    return DOCUMENTS_URL.format(wedding_id=wedding.id) + suffix


def an_item(db_session: Session, wedding: Wedding, name: str = "Atelier Valentina", **fields) -> Item:
    item = Item(wedding_id=wedding.id, name=name, **fields)
    db_session.add(item)
    db_session.commit()
    return item


def upload(client: TestClient, wedding: Wedding, name="IMG_0412.jpg", body=JPEG, content_type="image/jpeg", **form):
    return client.post(url(wedding), files={"file": (name, body, content_type)}, data=form)


def a_document(db_session: Session, wedding: Wedding, bucket: FakeBucket, title: str = "Fitting 1", **fields) -> Document:
    key = f"weddings/{wedding.id}/documents/{title.replace(' ', '-')}"
    bucket.objects[key] = (JPEG, "image/jpeg")
    document = Document(
        wedding_id=wedding.id,
        title=title,
        file_name="IMG_0412.jpg",
        content_type="image/jpeg",
        size_bytes=len(JPEG),
        storage_key=key,
        **fields,
    )
    db_session.add(document)
    db_session.commit()
    return document


# Uploading


def test_given_a_photo_for_an_item_when_it_is_uploaded_then_the_bucket_has_it_and_the_item_lists_it(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    dress = Category(wedding_id=wedding.id, name="Dress", color="#7b7ff0")
    shop = an_item(db_session, wedding, category=dress)

    response = upload(client, wedding, item_id=shop.id)

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "IMG_0412"
    assert body["kind"] == "photo"
    assert (body["file_name"], body["content_type"], body["size_bytes"]) == ("IMG_0412.jpg", "image/jpeg", len(JPEG))
    assert (body["item_id"], body["item_name"], body["category_id"]) == (shop.id, "Atelier Valentina", dress.id)
    [(key, stored)] = bucket.objects.items()
    assert stored == (JPEG, "image/jpeg")
    assert key.startswith(f"weddings/{wedding.id}/documents/")
    assert "storage_key" not in body


def test_given_a_pdf_when_it_is_uploaded_without_a_kind_then_it_counts_as_a_paper(
    client: TestClient, wedding: Wedding, bucket: FakeBucket
):
    response = upload(client, wedding, "Partida de nacimiento.pdf", PDF, "application/pdf")

    assert (response.json()["kind"], response.json()["title"]) == ("paper", "Partida de nacimiento")


def test_given_a_paper_with_its_details_when_it_is_uploaded_then_they_are_kept(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    vicky = UserAccount(wedding_id=wedding.id, email="vicky@example.com", display_name="Vicky")
    db_session.add(vicky)
    db_session.commit()

    response = upload(
        client,
        wedding,
        "scan.jpg",
        kind="paper",
        title="Passport",
        person_id=vicky.id,
        issued_on="2021-03-02",
        expires_on="2031-03-01",
    )

    body = response.json()
    assert (body["kind"], body["title"], body["person_id"]) == ("paper", "Passport", vicky.id)
    assert (body["issued_on"], body["expires_on"]) == ("2021-03-02", "2031-03-01")


def test_given_a_file_for_a_task_when_it_is_uploaded_then_it_also_lands_on_the_task_item(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    church = an_item(db_session, wedding, "Iglesia San José")
    task = Requirement(wedding_id=wedding.id, item=church, title="Get baptism certificates")
    db_session.add(task)
    db_session.commit()

    response = upload(client, wedding, "baptism.pdf", PDF, "application/pdf", requirement_id=task.id)

    body = response.json()
    assert (body["requirement_id"], body["requirement_title"]) == (task.id, "Get baptism certificates")
    assert body["item_id"] == church.id


def test_given_a_task_of_another_item_when_a_file_names_both_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    church = an_item(db_session, wedding, "Iglesia San José")
    shop = an_item(db_session, wedding)
    task = Requirement(wedding_id=wedding.id, item=church, title="Get baptism certificates")
    db_session.add(task)
    db_session.commit()

    response = upload(client, wedding, item_id=shop.id, requirement_id=task.id)

    assert response.status_code == 422
    assert bucket.objects == {}


@pytest.mark.parametrize("field", ["item_id", "requirement_id", "person_id"])
def test_given_an_unknown_link_when_a_file_is_uploaded_then_it_is_refused_and_nothing_is_stored(
    client: TestClient, wedding: Wedding, bucket: FakeBucket, field: str
):
    response = upload(client, wedding, **{field: 999})

    assert response.status_code == 422
    assert bucket.objects == {}


def test_given_a_file_type_the_planner_cannot_show_when_it_is_uploaded_then_it_is_refused(
    client: TestClient, wedding: Wedding, bucket: FakeBucket
):
    response = upload(client, wedding, "page.html", b"<script>", "text/html")

    assert response.status_code == 415
    assert bucket.objects == {}


def test_given_a_file_over_the_size_limit_when_it_is_uploaded_then_it_is_refused(
    client: TestClient, wedding: Wedding, bucket: FakeBucket
):
    response = upload(client, wedding, body=b"\xff" * (MAX_UPLOAD_BYTES + 1))

    assert response.status_code == 413
    assert bucket.objects == {}


def test_given_an_empty_file_when_it_is_uploaded_then_it_is_refused(
    client: TestClient, wedding: Wedding, bucket: FakeBucket
):
    assert upload(client, wedding, body=b"").status_code == 422


def test_given_a_hidden_item_when_a_file_is_uploaded_to_it_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    someone_else = UserAccount(wedding_id=wedding.id, email="g@example.com", display_name="Gerardo")
    db_session.add(someone_else)
    db_session.commit()
    surprise = an_item(db_session, wedding, "Surprise", is_private=True, created_by_id=someone_else.id)

    assert upload(client, wedding, item_id=surprise.id).status_code == 422


def test_given_documents_are_not_set_up_when_a_file_is_uploaded_then_it_says_so(
    client: TestClient, wedding: Wedding
):
    app.dependency_overrides[get_document_storage] = lambda: None

    response = upload(client, wedding)

    assert response.status_code == 503
    assert "aren't set up" in response.json()["detail"]


# Listing


def test_given_documents_when_they_are_listed_then_the_newest_come_first_with_their_item(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    shop = an_item(db_session, wedding)
    a_document(db_session, wedding, bucket, "Fitting 1", item=shop)
    a_document(db_session, wedding, bucket, "Passport", kind=DocumentKind.PAPER)

    response = client.get(url(wedding))

    assert [(each["title"], each["item_name"]) for each in response.json()] == [
        ("Passport", None),
        ("Fitting 1", "Atelier Valentina"),
    ]


def test_given_documents_when_they_are_filtered_then_only_the_matching_ones_come_back(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    shop = an_item(db_session, wedding)
    task = Requirement(wedding_id=wedding.id, item=shop, title="Second fitting")
    db_session.add(task)
    db_session.commit()
    a_document(db_session, wedding, bucket, "Fitting 1", item=shop)
    a_document(db_session, wedding, bucket, "Fitting 2", item=shop, requirement=task)
    a_document(db_session, wedding, bucket, "Passport", kind=DocumentKind.PAPER)

    def titles(**query) -> list[str]:
        return [each["title"] for each in client.get(url(wedding), params=query).json()]

    assert titles(item_id=shop.id) == ["Fitting 2", "Fitting 1"]
    assert titles(requirement_id=task.id) == ["Fitting 2"]
    assert titles(kind="paper") == ["Passport"]


def test_given_a_file_under_a_hidden_item_when_documents_are_listed_then_it_is_left_out(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    someone_else = UserAccount(wedding_id=wedding.id, email="g@example.com", display_name="Gerardo")
    db_session.add(someone_else)
    db_session.commit()
    surprise = an_item(db_session, wedding, "Surprise", is_private=True, created_by_id=someone_else.id)
    a_document(db_session, wedding, bucket, "Ring", item=surprise)
    a_document(db_session, wedding, bucket, "Passport")

    assert [each["title"] for each in client.get(url(wedding)).json()] == ["Passport"]


def test_given_another_wedding_when_documents_are_listed_then_its_files_never_show(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    other = Wedding(name="Other", wedding_date=date(2027, 1, 1))
    db_session.add(other)
    db_session.commit()
    a_document(db_session, other, bucket, "Their passport")

    assert client.get(url(wedding)).json() == []


# Opening


def test_given_a_document_when_it_is_opened_then_it_goes_to_a_short_lived_link(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    document = a_document(db_session, wedding, bucket)

    response = client.get(url(wedding, f"/{document.id}/file"), follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"].startswith("https://storage.googleapis.com/la-bodita-documents/")
    assert response.headers["cache-control"] == "no-store"
    [(_, options)] = bucket.signed
    assert "IMG_0412.jpg" in options["response_disposition"]


def test_given_a_file_under_a_hidden_item_when_it_is_opened_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    someone_else = UserAccount(wedding_id=wedding.id, email="g@example.com", display_name="Gerardo")
    db_session.add(someone_else)
    db_session.commit()
    surprise = an_item(db_session, wedding, "Surprise", is_private=True, created_by_id=someone_else.id)
    document = a_document(db_session, wedding, bucket, "Ring", item=surprise)

    response = client.get(url(wedding, f"/{document.id}/file"), follow_redirects=False)

    assert response.status_code == 404
    assert bucket.signed == []


# Changing


def test_given_a_photo_when_it_becomes_a_paper_of_a_task_then_its_details_change(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    church = an_item(db_session, wedding, "Iglesia San José")
    task = Requirement(wedding_id=wedding.id, item=church, title="Pre-Cana course")
    db_session.add(task)
    db_session.commit()
    document = a_document(db_session, wedding, bucket, "IMG_0413")

    response = client.patch(
        url(wedding, f"/{document.id}"),
        json={"title": "Pre-Cana certificate", "kind": "paper", "requirement_id": task.id, "issued_on": "2026-10-04"},
    )

    body = response.json()
    assert response.status_code == 200
    assert (body["title"], body["kind"], body["issued_on"]) == ("Pre-Cana certificate", "paper", "2026-10-04")
    assert (body["requirement_id"], body["item_id"]) == (task.id, church.id)


def test_given_a_file_on_a_task_when_it_is_moved_to_another_item_then_it_leaves_the_task(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    church = an_item(db_session, wedding, "Iglesia San José")
    shop = an_item(db_session, wedding)
    task = Requirement(wedding_id=wedding.id, item=church, title="Pre-Cana course")
    db_session.add(task)
    db_session.commit()
    document = a_document(db_session, wedding, bucket, item=church, requirement=task)

    body = client.patch(url(wedding, f"/{document.id}"), json={"item_id": shop.id}).json()

    assert (body["item_id"], body["requirement_id"]) == (shop.id, None)


def test_given_a_document_when_its_title_is_blanked_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    document = a_document(db_session, wedding, bucket)

    assert client.patch(url(wedding, f"/{document.id}"), json={"title": None}).status_code == 422


# Deleting


def test_given_a_document_when_it_is_deleted_then_the_bucket_and_the_list_lose_it(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    document = a_document(db_session, wedding, bucket)

    response = client.delete(url(wedding, f"/{document.id}"))

    assert response.status_code == 204
    assert bucket.objects == {}
    assert db_session.scalars(select(Document)).all() == []


def test_given_an_item_with_files_when_the_item_is_deleted_then_its_files_leave_the_bucket(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    shop = an_item(db_session, wedding)
    a_document(db_session, wedding, bucket, "Fitting 1", item=shop)
    a_document(db_session, wedding, bucket, "Passport")

    response = client.delete(f"/api/weddings/{wedding.id}/items/{shop.id}")

    assert response.status_code == 204
    assert list(bucket.objects) == [f"weddings/{wedding.id}/documents/Passport"]


def test_given_documents_are_not_set_up_when_an_item_is_deleted_then_it_still_goes(
    client: TestClient, db_session: Session, wedding: Wedding
):
    app.dependency_overrides[get_document_storage] = lambda: None
    shop = an_item(db_session, wedding)

    assert client.delete(f"/api/weddings/{wedding.id}/items/{shop.id}").status_code == 204


def test_given_a_paper_when_it_is_given_to_someone_then_it_becomes_theirs(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    gerardo = UserAccount(wedding_id=wedding.id, email="g@example.com", display_name="Gerardo")
    db_session.add(gerardo)
    db_session.commit()
    document = a_document(db_session, wedding, bucket, "Passport", kind=DocumentKind.PAPER)

    body = client.patch(url(wedding, f"/{document.id}"), json={"person_id": gerardo.id}).json()

    assert body["person_id"] == gerardo.id


def test_given_a_file_when_it_is_put_on_a_task_and_another_item_at_once_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    church = an_item(db_session, wedding, "Iglesia San José")
    shop = an_item(db_session, wedding)
    task = Requirement(wedding_id=wedding.id, item=church, title="Pre-Cana course")
    db_session.add(task)
    db_session.commit()
    document = a_document(db_session, wedding, bucket)

    response = client.patch(url(wedding, f"/{document.id}"), json={"item_id": shop.id, "requirement_id": task.id})

    assert response.status_code == 422


def test_given_a_file_on_a_task_when_it_is_taken_off_the_task_then_it_stays_on_the_item(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    church = an_item(db_session, wedding, "Iglesia San José")
    task = Requirement(wedding_id=wedding.id, item=church, title="Pre-Cana course")
    db_session.add(task)
    db_session.commit()
    document = a_document(db_session, wedding, bucket, item=church, requirement=task)

    body = client.patch(url(wedding, f"/{document.id}"), json={"requirement_id": None}).json()

    assert (body["item_id"], body["requirement_id"]) == (church.id, None)


def test_given_documents_are_not_set_up_when_a_document_row_is_deleted_then_the_row_still_goes(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket
):
    document = a_document(db_session, wedding, bucket)
    app.dependency_overrides[get_document_storage] = lambda: None

    assert client.delete(url(wedding, f"/{document.id}")).status_code == 204
    assert db_session.scalars(select(Document)).all() == []


def test_given_the_row_cannot_be_saved_when_a_file_is_uploaded_then_the_file_leaves_the_bucket_again(
    client: TestClient, db_session: Session, wedding: Wedding, bucket: FakeBucket, monkeypatch
):
    def fail():
        raise RuntimeError("disk full")

    monkeypatch.setattr(db_session, "commit", fail)

    with pytest.raises(RuntimeError):
        upload(client, wedding)

    assert bucket.objects == {}
