"""The allow-list is managed from the Pi's command line: there is no sign-up page."""

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import start_session
from app.models import UserAccount, UserSession, Wedding
from app.users import add_user, main, remove_user


def test_given_a_wedding_when_a_user_is_added_then_they_can_sign_in(db_session: Session, wedding: Wedding):
    account = add_user(db_session, "Gerardo@Example.com", "Gerardo")

    assert account.wedding_id == wedding.id
    assert account.email == "gerardo@example.com"
    assert account.display_name == "Gerardo"


def test_given_a_user_already_listed_when_they_are_added_again_then_their_name_is_updated(
    db_session: Session, wedding: Wedding
):
    add_user(db_session, "gerardo@example.com", "Gera")

    add_user(db_session, "gerardo@example.com", "Gerardo")

    assert [account.display_name for account in db_session.scalars(select(UserAccount))] == ["Gerardo"]


def test_given_no_wedding_when_a_user_is_added_then_it_says_to_seed_first(db_session: Session):
    with pytest.raises(SystemExit, match="app.seed"):
        add_user(db_session, "gerardo@example.com", "Gerardo")


def test_given_a_signed_in_user_when_they_are_removed_then_their_sessions_end_too(
    db_session: Session, wedding: Wedding
):
    account = add_user(db_session, "gerardo@example.com", "Gerardo")
    start_session(db_session, account)

    assert remove_user(db_session, "GERARDO@example.com") is True

    assert db_session.scalars(select(UserAccount)).all() == []
    assert db_session.scalars(select(UserSession)).all() == []


def test_given_an_unknown_email_when_it_is_removed_then_nothing_happens(db_session: Session, wedding: Wedding):
    assert remove_user(db_session, "nobody@example.com") is False


def test_given_the_command_line_when_users_are_added_listed_and_removed_then_each_is_reported(
    db_session: Session, wedding: Wedding, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture
):
    monkeypatch.setattr("app.users.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    main(["add", "--email", "vicky@example.com", "--name", "Vicky"])
    main(["list"])
    main(["remove", "--email", "vicky@example.com"])
    main(["remove", "--email", "vicky@example.com"])

    output = capsys.readouterr().out.splitlines()
    assert output == [
        "added vicky@example.com (Vicky)",
        "vicky@example.com  Vicky",
        "removed vicky@example.com",
        "vicky@example.com was not on the list",
    ]
