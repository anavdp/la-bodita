import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import UserAccount, Wedding


def test_given_a_new_account_when_it_is_saved_then_its_email_is_kept_in_lowercase(
    db_session: Session, wedding: Wedding
):
    """Google may hand back the address in any case; the allow-list must match it either way."""
    account = UserAccount(wedding_id=wedding.id, email="  Vicky@Example.com ", display_name="Vicky")

    db_session.add(account)
    db_session.commit()

    assert account.email == "vicky@example.com"


def test_given_an_email_already_on_the_list_when_it_is_added_again_then_it_is_refused(
    db_session: Session, wedding: Wedding
):
    db_session.add(UserAccount(wedding_id=wedding.id, email="vicky@example.com", display_name="Vicky"))
    db_session.commit()

    db_session.add(UserAccount(wedding_id=wedding.id, email="VICKY@example.com", display_name="Other"))

    with pytest.raises(IntegrityError):
        db_session.commit()
