from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Item, Requirement, Wedding


def test_given_a_task_for_an_item_when_it_is_saved_then_it_is_open_and_listed_under_the_item(
    db_session: Session, wedding: Wedding
):
    church = Item(wedding_id=wedding.id, name="Iglesia de Araure")
    task = Requirement(
        wedding_id=wedding.id,
        item=church,
        title="Bring both baptism certificates",
        due_date=date(2026, 10, 23),
    )

    db_session.add(task)
    db_session.commit()

    assert task.is_done is False
    assert task.due_time is None
    assert [requirement.title for requirement in church.requirements] == ["Bring both baptism certificates"]


def test_given_an_appointment_when_it_is_saved_then_it_keeps_its_date_and_time(db_session: Session, wedding: Wedding):
    tasting = Requirement(
        wedding_id=wedding.id,
        title="Cake tasting",
        due_date=date(2026, 10, 31),
        due_time=time(11, 0),
    )

    db_session.add(tasting)
    db_session.commit()
    db_session.expire(tasting)

    assert (tasting.due_date, tasting.due_time) == (date(2026, 10, 31), time(11, 0))


def test_given_a_general_task_when_it_is_saved_then_it_needs_no_item(db_session: Session, wedding: Wedding):
    task = Requirement(wedding_id=wedding.id, title="Pick the wedding colors")

    db_session.add(task)
    db_session.commit()

    assert task.item_id is None


def test_given_an_item_with_tasks_when_the_item_is_deleted_then_its_tasks_go_with_it(
    db_session: Session, wedding: Wedding
):
    photographer = Item(wedding_id=wedding.id, name="Studio Caracola")
    photographer.requirements = [Requirement(wedding_id=wedding.id, title="Ask for a quote")]
    db_session.add(photographer)
    db_session.commit()

    db_session.delete(photographer)
    db_session.commit()

    assert db_session.scalars(select(Requirement)).all() == []
