from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BudgetLine, BudgetLineStatus, Category, Item, Wedding

BUDGET_URL = "/api/weddings/{wedding_id}/budget-lines"


def an_item(db_session: Session, wedding: Wedding, name: str = "Luz de Agua", category: Category | None = None) -> Item:
    item = Item(wedding_id=wedding.id, name=name, category=category)
    db_session.add(item)
    db_session.commit()
    return item


def a_line(db_session: Session, wedding: Wedding, title: str, **fields) -> BudgetLine:
    line = BudgetLine(wedding_id=wedding.id, title=title, **fields)
    db_session.add(line)
    db_session.commit()
    return line


def line_url(wedding: Wedding, line: BudgetLine) -> str:
    return f"{BUDGET_URL.format(wedding_id=wedding.id)}/{line.id}"


def test_given_lines_when_they_are_listed_then_they_come_in_the_order_they_were_added(
    client: TestClient, db_session: Session, wedding: Wedding
):
    a_line(db_session, wedding, "Parish fee", estimated_amount=Decimal("300"))
    a_line(db_session, wedding, "Choir", estimated_amount=Decimal("250"))

    response = client.get(BUDGET_URL.format(wedding_id=wedding.id))

    assert response.status_code == 200
    assert [line["title"] for line in response.json()] == ["Parish fee", "Choir"]


def test_given_a_line_for_an_item_when_it_is_listed_then_it_names_the_item_its_category_and_amounts(
    client: TestClient, db_session: Session, wedding: Wedding
):
    photo = Category(wedding_id=wedding.id, name="Photographer", color="#f39237")
    item = an_item(db_session, wedding, category=photo)
    a_line(
        db_session,
        wedding,
        "Photo + video",
        item=item,
        status=BudgetLineStatus.PAID,
        estimated_amount=Decimal("1800"),
        actual_amount=Decimal("1750.50"),
    )

    line = client.get(BUDGET_URL.format(wedding_id=wedding.id)).json()[0]

    assert line["item_id"] == item.id
    assert line["item_name"] == "Luz de Agua"
    assert line["category_id"] == photo.id
    assert line["status"] == "paid"
    assert line["currency"] == "USD"
    assert line["estimated_amount"] == 1800
    assert line["actual_amount"] == 1750.5


def test_given_another_weddings_lines_when_they_are_listed_then_they_are_not_included(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    a_line(db_session, other_wedding, "Not ours")

    assert client.get(BUDGET_URL.format(wedding_id=wedding.id)).json() == []


def test_given_a_quote_when_it_is_added_for_an_item_then_it_is_saved_as_an_idea(
    client: TestClient, db_session: Session, wedding: Wedding
):
    item = an_item(db_session, wedding, name="Dulce Rosa")

    response = client.post(
        BUDGET_URL.format(wedding_id=wedding.id),
        json={"title": "3 tiers", "item_id": item.id, "estimated_amount": 450, "currency": "eur", "notes": "Tasting Oct 30"},
    )

    assert response.status_code == 201
    body = response.json()
    assert (body["status"], body["currency"], body["item_name"]) == ("idea", "EUR", "Dulce Rosa")
    assert body["estimated_amount"] == 450
    assert db_session.scalars(select(BudgetLine.title)).all() == ["3 tiers"]


def test_given_a_negative_amount_when_a_line_is_added_then_it_is_rejected(client: TestClient, wedding: Wedding):
    response = client.post(BUDGET_URL.format(wedding_id=wedding.id), json={"title": "Refund?", "estimated_amount": -5})

    assert response.status_code == 422


def test_given_a_made_up_currency_when_a_line_is_added_then_it_is_rejected(client: TestClient, wedding: Wedding):
    response = client.post(BUDGET_URL.format(wedding_id=wedding.id), json={"title": "Cake", "currency": "dollars"})

    assert response.status_code == 422


def test_given_no_quote_when_a_line_is_added_switched_on_then_it_is_rejected(client: TestClient, wedding: Wedding):
    """A line without an amount cannot count toward a total, so it stays an idea."""
    response = client.post(
        BUDGET_URL.format(wedding_id=wedding.id), json={"title": "Studio Caracola", "status": "considering"}
    )

    assert response.status_code == 422


def test_given_another_weddings_item_when_a_line_is_added_for_it_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = an_item(db_session, other_wedding)

    response = client.post(BUDGET_URL.format(wedding_id=wedding.id), json={"title": "Hijack", "item_id": foreign.id})

    assert response.status_code == 422


def test_given_an_idea_with_a_quote_when_it_is_switched_on_then_it_is_being_considered(
    client: TestClient, db_session: Session, wedding: Wedding
):
    line = a_line(db_session, wedding, "Choir", estimated_amount=Decimal("250"))

    response = client.patch(line_url(wedding, line), json={"status": "considering"})

    assert response.status_code == 200
    assert response.json()["status"] == "considering"
    assert response.json()["estimated_amount"] == 250


def test_given_an_idea_without_a_quote_when_it_is_switched_on_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    line = a_line(db_session, wedding, "Studio Caracola")

    response = client.patch(line_url(wedding, line), json={"status": "considering"})

    assert response.status_code == 422


def test_given_a_line_that_is_on_when_its_quote_is_cleared_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    line = a_line(db_session, wedding, "Choir", estimated_amount=Decimal("250"), status=BudgetLineStatus.CONSIDERING)

    response = client.patch(line_url(wedding, line), json={"estimated_amount": None})

    assert response.status_code == 422


def test_given_a_paid_line_with_only_a_final_price_when_its_quote_is_cleared_then_it_keeps_counting(
    client: TestClient, db_session: Session, wedding: Wedding
):
    line = a_line(
        db_session,
        wedding,
        "Parish fee",
        estimated_amount=Decimal("300"),
        actual_amount=Decimal("320"),
        status=BudgetLineStatus.PAID,
    )

    response = client.patch(line_url(wedding, line), json={"estimated_amount": None})

    assert response.status_code == 200
    assert response.json()["actual_amount"] == 320


def test_given_a_line_when_it_moves_to_another_item_and_is_retitled_then_both_change(
    client: TestClient, db_session: Session, wedding: Wedding
):
    first = an_item(db_session, wedding)
    second = an_item(db_session, wedding, name="Andrés Rivas Photo")
    line = a_line(db_session, wedding, "Photo only", item=first)

    response = client.patch(line_url(wedding, line), json={"item_id": second.id, "title": "Photo only, 6 hours"})

    assert (response.json()["item_name"], response.json()["title"]) == ("Andrés Rivas Photo", "Photo only, 6 hours")


def test_given_a_line_when_its_title_or_status_is_blanked_then_it_is_rejected(
    client: TestClient, db_session: Session, wedding: Wedding
):
    line = a_line(db_session, wedding, "Choir")

    assert client.patch(line_url(wedding, line), json={"title": None}).status_code == 422
    assert client.patch(line_url(wedding, line), json={"status": None}).status_code == 422
    assert client.patch(line_url(wedding, line), json={"currency": None}).status_code == 422


def test_given_a_line_when_it_is_deleted_then_it_is_gone(client: TestClient, db_session: Session, wedding: Wedding):
    line = a_line(db_session, wedding, "Choir")

    response = client.delete(line_url(wedding, line))

    assert response.status_code == 204
    assert db_session.scalars(select(BudgetLine)).all() == []


def test_given_another_weddings_line_when_it_is_changed_then_it_is_not_found(
    client: TestClient, db_session: Session, wedding: Wedding
):
    other_wedding = Wedding(name="Otra boda")
    db_session.add(other_wedding)
    db_session.commit()
    foreign = a_line(db_session, other_wedding, "Not ours")

    response = client.patch(line_url(wedding, foreign), json={"title": "Ours now"})

    assert response.status_code == 404
