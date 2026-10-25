"""The papers an item asks for (the church wants baptism certificates), and which are still missing."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentKind, Item, PaperRequest, Requirement, UserAccount, Wedding

REQUESTS_URL = "/api/weddings/{wedding_id}/paper-requests"


def url(wedding: Wedding, suffix: str = "") -> str:
    return REQUESTS_URL.format(wedding_id=wedding.id) + suffix


def an_item(db_session: Session, wedding: Wedding, name: str = "Iglesia San José", **fields) -> Item:
    item = Item(wedding_id=wedding.id, name=name, **fields)
    db_session.add(item)
    db_session.commit()
    return item


def a_person(db_session: Session, wedding: Wedding, name: str = "Vicky") -> UserAccount:
    person = UserAccount(wedding_id=wedding.id, email=f"{name.lower()}@example.com", display_name=name)
    db_session.add(person)
    db_session.commit()
    return person


def a_paper(db_session: Session, wedding: Wedding, title: str = "Baptism certificate", **fields) -> Document:
    paper = Document(
        wedding_id=wedding.id,
        title=title,
        kind=DocumentKind.PAPER,
        file_name="baptism.pdf",
        content_type="application/pdf",
        size_bytes=1000,
        storage_key=f"weddings/{wedding.id}/documents/{title}",
        **fields,
    )
    db_session.add(paper)
    db_session.commit()
    return paper


def a_request(db_session: Session, wedding: Wedding, item: Item, name: str, **fields) -> PaperRequest:
    request = PaperRequest(wedding_id=wedding.id, item=item, name=name, **fields)
    db_session.add(request)
    db_session.commit()
    return request


def test_given_an_item_when_it_asks_for_a_paper_for_someone_then_the_paper_is_missing(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    vicky = a_person(db_session, wedding)

    response = client.post(url(wedding), json={"item_id": church.id, "name": "Confirmation certificate", "person_id": vicky.id})

    assert response.status_code == 201
    body = response.json()
    assert (body["name"], body["item_id"], body["item_name"], body["person_id"]) == (
        "Confirmation certificate",
        church.id,
        "Iglesia San José",
        vicky.id,
    )
    assert (body["document_id"], body["is_missing"]) == (None, True)


def test_given_a_request_for_a_task_when_it_is_made_then_it_sits_on_that_task_and_its_item(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    meeting = Requirement(wedding_id=wedding.id, item=church, title="Meeting with Padre Luis")
    db_session.add(meeting)
    db_session.commit()

    body = client.post(url(wedding), json={"requirement_id": meeting.id, "name": "Banns form"}).json()

    assert (body["item_id"], body["requirement_id"], body["requirement_title"]) == (
        church.id,
        meeting.id,
        "Meeting with Padre Luis",
    )


def test_given_no_item_or_task_when_a_paper_is_asked_for_then_it_is_refused(client: TestClient, wedding: Wedding):
    assert client.post(url(wedding), json={"name": "Banns form"}).status_code == 422


def test_given_a_task_of_another_item_when_a_request_names_both_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    registry = an_item(db_session, wedding, "Registro civil")
    meeting = Requirement(wedding_id=wedding.id, item=church, title="Meeting")
    db_session.add(meeting)
    db_session.commit()

    response = client.post(url(wedding), json={"item_id": registry.id, "requirement_id": meeting.id, "name": "Banns"})

    assert response.status_code == 422


def test_given_a_missing_paper_when_an_uploaded_one_answers_it_then_it_is_no_longer_missing(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    request = a_request(db_session, wedding, church, "Baptism certificate")
    paper = a_paper(db_session, wedding)

    body = client.patch(url(wedding, f"/{request.id}"), json={"document_id": paper.id}).json()

    assert (body["document_id"], body["document_title"], body["is_missing"]) == (
        paper.id,
        "Baptism certificate",
        False,
    )


def test_given_one_passport_when_two_items_ask_for_it_then_it_answers_both(
    client: TestClient, db_session: Session, wedding: Wedding
):
    passport = a_paper(db_session, wedding, "Passport")
    registry = an_item(db_session, wedding, "Registro civil")
    consulate = an_item(db_session, wedding, "Consolato")
    first = a_request(db_session, wedding, registry, "Passport")
    second = a_request(db_session, wedding, consulate, "Passport")

    for request in (first, second):
        client.patch(url(wedding, f"/{request.id}"), json={"document_id": passport.id})

    assert [each["is_missing"] for each in client.get(url(wedding)).json()] == [False, False]


def test_given_an_answered_request_when_its_paper_is_deleted_then_it_is_missing_again(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    paper = a_paper(db_session, wedding)
    request = a_request(db_session, wedding, church, "Baptism certificate", document=paper)

    db_session.delete(paper)
    db_session.commit()
    db_session.expire(request)

    assert request.document_id is None


def test_given_requests_when_only_missing_ones_are_asked_for_then_answered_ones_are_left_out(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    registry = an_item(db_session, wedding, "Registro civil")
    a_request(db_session, wedding, church, "Baptism certificate", document=a_paper(db_session, wedding))
    a_request(db_session, wedding, church, "Banns form")
    a_request(db_session, wedding, registry, "Fe de vida y estado")

    def names(**query) -> list[str]:
        return [each["name"] for each in client.get(url(wedding), params=query).json()]

    assert names(missing=True) == ["Banns form", "Fe de vida y estado"]
    assert names(item_id=church.id) == ["Baptism certificate", "Banns form"]


def test_given_a_request_under_a_hidden_item_when_requests_are_listed_then_it_is_left_out(
    client: TestClient, db_session: Session, wedding: Wedding
):
    gerardo = a_person(db_session, wedding, "Gerardo")
    surprise = an_item(db_session, wedding, "Surprise", is_private=True, created_by_id=gerardo.id)
    hidden = a_request(db_session, wedding, surprise, "Ring size")

    assert client.get(url(wedding)).json() == []
    assert client.patch(url(wedding, f"/{hidden.id}"), json={"name": "x"}).status_code == 404


def test_given_an_unknown_paper_or_person_when_a_request_points_at_it_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding
):
    request = a_request(db_session, wedding, an_item(db_session, wedding), "Banns form")

    assert client.patch(url(wedding, f"/{request.id}"), json={"document_id": 999}).status_code == 422
    assert client.patch(url(wedding, f"/{request.id}"), json={"person_id": 999}).status_code == 422


def test_given_a_request_when_it_is_renamed_and_moved_to_a_task_then_both_change(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    meeting = Requirement(wedding_id=wedding.id, item=church, title="Meeting")
    db_session.add(meeting)
    db_session.commit()
    request = a_request(db_session, wedding, church, "Banns")

    body = client.patch(url(wedding, f"/{request.id}"), json={"name": "Banns form", "requirement_id": meeting.id}).json()

    assert (body["name"], body["requirement_id"]) == ("Banns form", meeting.id)


def test_given_a_request_when_its_task_is_set_to_another_items_task_then_it_is_refused(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    registry = an_item(db_session, wedding, "Registro civil")
    elsewhere = Requirement(wedding_id=wedding.id, item=registry, title="Appointment")
    db_session.add(elsewhere)
    db_session.commit()
    request = a_request(db_session, wedding, church, "Banns")

    assert client.patch(url(wedding, f"/{request.id}"), json={"requirement_id": elsewhere.id}).status_code == 422


def test_given_a_request_when_it_is_deleted_then_its_paper_stays(
    client: TestClient, db_session: Session, wedding: Wedding
):
    paper = a_paper(db_session, wedding)
    request = a_request(db_session, wedding, an_item(db_session, wedding), "Baptism certificate", document=paper)

    assert client.delete(url(wedding, f"/{request.id}")).status_code == 204
    assert db_session.scalars(select(PaperRequest)).all() == []
    assert db_session.scalars(select(Document)).all() == [paper]


def test_given_an_item_with_requests_when_the_item_is_deleted_then_its_requests_go_too(
    client: TestClient, db_session: Session, wedding: Wedding
):
    church = an_item(db_session, wedding)
    a_request(db_session, wedding, church, "Banns form")

    client.delete(f"/api/weddings/{wedding.id}/items/{church.id}")

    assert db_session.scalars(select(PaperRequest)).all() == []


def test_given_an_answered_request_when_its_paper_is_taken_off_then_it_is_missing_again(
    client: TestClient, db_session: Session, wedding: Wedding
):
    paper = a_paper(db_session, wedding)
    request = a_request(db_session, wedding, an_item(db_session, wedding), "Baptism certificate", document=paper)

    body = client.patch(url(wedding, f"/{request.id}"), json={"document_id": None}).json()

    assert body["is_missing"] is True
