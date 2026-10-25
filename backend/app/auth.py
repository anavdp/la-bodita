"""Who is signed in: the planner's sessions, and the guard on every planner route.

A session is a long random token in an HttpOnly cookie. Only its SHA-256 hash is
stored, so the database alone cannot sign anyone in, and signing out deletes the
row so the cookie stops working at once.
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_session
from app.models import UserAccount, UserSession
from app.models.mixins import utc_now

SESSION_COOKIE = "la_bodita_session"
SESSION_LIFETIME = timedelta(days=30)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def uses_https() -> bool:
    """Cookies are Secure wherever the planner is served over https, i.e. everywhere but a laptop."""
    return settings.planner_url.startswith("https://")


def start_session(session: Session, account: UserAccount, now: datetime | None = None) -> str:
    """Sign this account in on one browser; returns the token for its cookie."""
    token = secrets.token_urlsafe(32)
    now = utc_now() if now is None else now
    session.add(
        UserSession(user_account_id=account.id, token_hash=hash_token(token), expires_at=now + SESSION_LIFETIME)
    )
    session.commit()
    return token


def end_session(session: Session, token: str) -> None:
    session.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
    session.commit()


def signed_in_account(session: Session, token: str | None) -> UserAccount | None:
    if not token:
        return None
    return session.scalars(
        select(UserAccount)
        .join(UserSession, UserSession.user_account_id == UserAccount.id)
        .where(UserSession.token_hash == hash_token(token), UserSession.expires_at > utc_now())
    ).first()


def set_session_cookie(response: Response, token: str) -> None:
    # Strict: no other website can make the browser send it. The planner's own
    # requests are same-site, so it never gets in the way.
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        secure=uses_https(),
        samesite="strict",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, httponly=True, secure=uses_https(), samesite="strict")


def require_user(request: Request, session: Annotated[Session, Depends(get_session)]) -> UserAccount:
    """The signed-in account, or 401. Guards every planner route.

    A route under one wedding is also closed to the other weddings' users: it
    answers 404, as if the wedding were not there.
    """
    account = signed_in_account(session, request.cookies.get(SESSION_COOKIE))
    if account is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to use the planner")
    wedding_id = request.path_params.get("wedding_id")
    if wedding_id is not None and wedding_id != str(account.wedding_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Wedding not found")
    return account


CurrentUser = Annotated[UserAccount, Depends(require_user)]
