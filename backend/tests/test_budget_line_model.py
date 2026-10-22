from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import BudgetLine, BudgetLineStatus, Item, Wedding


def test_given_a_quote_for_an_item_when_it_is_saved_then_it_starts_as_an_idea_in_dollars(
    db_session: Session, wedding: Wedding
):
    photographer = Item(wedding_id=wedding.id, name="Luz de Agua Fotografía")
    line = BudgetLine(
        wedding_id=wedding.id, item=photographer, title="Photo + video, 8 hours", estimated_amount=Decimal("1800")
    )

    db_session.add(line)
    db_session.commit()
    db_session.expire(line)

    assert line.status is BudgetLineStatus.IDEA
    assert line.currency == "USD"
    assert line.estimated_amount == Decimal("1800.00")
    assert line.actual_amount is None
    assert [each.title for each in photographer.budget_lines] == ["Photo + video, 8 hours"]


def test_given_a_line_without_an_item_when_it_is_saved_then_it_needs_no_quote_yet(
    db_session: Session, wedding: Wedding
):
    line = BudgetLine(wedding_id=wedding.id, title="Flights to Venezuela")

    db_session.add(line)
    db_session.commit()

    assert (line.item_id, line.estimated_amount) == (None, None)


def test_given_an_item_with_quotes_when_the_item_is_deleted_then_its_quotes_go_with_it(
    db_session: Session, wedding: Wedding
):
    cake = Item(wedding_id=wedding.id, name="Dulce Rosa Pastelería")
    cake.budget_lines = [BudgetLine(wedding_id=wedding.id, title="3 tiers", estimated_amount=Decimal("450"))]
    db_session.add(cake)
    db_session.commit()

    db_session.delete(cake)
    db_session.commit()

    assert db_session.scalars(select(BudgetLine)).all() == []
