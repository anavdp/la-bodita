from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentKind, Item, Requirement, UserAccount, Wedding


def a_document(wedding: Wedding, **fields) -> Document:
    defaults = dict(
        wedding_id=wedding.id,
        title="Fitting 1",
        file_name="IMG_0412.jpg",
        content_type="image/jpeg",
        size_bytes=1_204_000,
        storage_key="weddings/1/documents/a1",
    )
    return Document(**{**defaults, **fields})


def test_given_a_photo_on_its_own_when_it_is_saved_then_it_is_a_photo_with_nothing_else_set(
    db_session: Session, wedding: Wedding
):
    document = a_document(wedding)

    db_session.add(document)
    db_session.commit()
    db_session.expire(document)

    assert document.kind is DocumentKind.PHOTO
    assert (document.item_id, document.requirement_id, document.person_id) == (None, None, None)
    assert (document.issued_on, document.expires_on, document.uploaded_by_id) == (None, None, None)


def test_given_a_paper_for_a_task_when_it_is_saved_then_it_keeps_whose_it_is_and_its_dates(
    db_session: Session, wedding: Wedding
):
    vicky = UserAccount(wedding_id=wedding.id, email="vicky@example.com", display_name="Vicky")
    church = Item(wedding_id=wedding.id, name="Iglesia San José")
    task = Requirement(wedding_id=wedding.id, item=church, title="Get baptism certificates")
    document = a_document(
        wedding,
        item=church,
        requirement=task,
        kind=DocumentKind.PAPER,
        title="Baptism certificate",
        person=vicky,
        uploaded_by=vicky,
        issued_on=date(2026, 9, 20),
        expires_on=date(2026, 12, 20),
    )

    db_session.add(document)
    db_session.commit()

    assert [each.title for each in church.documents] == ["Baptism certificate"]
    assert [each.title for each in task.documents] == ["Baptism certificate"]
    assert (document.person.display_name, document.uploaded_by.display_name) == ("Vicky", "Vicky")


def test_given_an_item_with_files_when_the_item_is_deleted_then_its_files_go_with_it(
    db_session: Session, wedding: Wedding
):
    shop = Item(wedding_id=wedding.id, name="Atelier Valentina")
    db_session.add(a_document(wedding, item=shop))
    db_session.commit()

    db_session.delete(shop)
    db_session.commit()

    assert db_session.scalars(select(Document)).all() == []


def test_given_a_task_with_a_file_when_the_task_is_deleted_then_the_file_stays_on_the_item(
    db_session: Session, wedding: Wedding
):
    shop = Item(wedding_id=wedding.id, name="Atelier Valentina")
    task = Requirement(wedding_id=wedding.id, item=shop, title="Second fitting")
    document = a_document(wedding, item=shop, requirement=task)
    db_session.add(document)
    db_session.commit()

    db_session.delete(task)
    db_session.commit()
    db_session.expire(document)

    assert (document.item_id, document.requirement_id) == (shop.id, None)
