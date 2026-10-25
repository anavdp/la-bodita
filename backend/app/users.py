"""Who may sign in to the planner. There is no sign-up page: the list is kept here.

On the Pi:

    docker compose exec backend python -m app.users add --email vicky@gmail.com --name Vicky
    docker compose exec backend python -m app.users list
    docker compose exec backend python -m app.users remove --email old@gmail.com
"""

import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import UserAccount, Wedding


def find_user(session: Session, email: str) -> UserAccount | None:
    return session.scalars(select(UserAccount).where(UserAccount.email == email.strip().lower())).first()


def add_user(session: Session, email: str, display_name: str) -> UserAccount:
    """Allow this email into the wedding's planner; adding it again just renames it."""
    wedding = session.scalars(select(Wedding).order_by(Wedding.id)).first()
    if wedding is None:
        raise SystemExit("No wedding yet: run `python -m app.seed` first.")

    account = find_user(session, email)
    if account is None:
        account = UserAccount(wedding_id=wedding.id, email=email)
        session.add(account)
    account.display_name = display_name
    session.commit()
    return account


def remove_user(session: Session, email: str) -> bool:
    """Take the email off the list; its sessions go with it, signing it out everywhere."""
    account = find_user(session, email)
    if account is None:
        return False
    session.delete(account)
    session.commit()
    return True


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Manage who may sign in to the planner.")
    commands = parser.add_subparsers(dest="command", required=True)
    add = commands.add_parser("add", help="allow a Google account in")
    add.add_argument("--email", required=True)
    add.add_argument("--name", required=True, help="the name shown in the top bar")
    commands.add_parser("list", help="show who may sign in")
    remove = commands.add_parser("remove", help="take an account off the list and sign it out")
    remove.add_argument("--email", required=True)
    arguments = parser.parse_args(argv)

    session = SessionLocal()
    try:
        if arguments.command == "add":
            account = add_user(session, arguments.email, arguments.name)
            print(f"added {account.email} ({account.display_name})")
        elif arguments.command == "list":
            for account in session.scalars(select(UserAccount).order_by(UserAccount.email)):
                print(f"{account.email}  {account.display_name}")
        elif remove_user(session, arguments.email):
            print(f"removed {arguments.email}")
        else:
            print(f"{arguments.email} was not on the list")
    finally:
        session.close()


if __name__ == "__main__":
    main()
