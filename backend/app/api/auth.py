"""Signing in with Google, finding out who is signed in, and signing out.

Sign-in is the OAuth authorization-code flow with PKCE, run on the server: the
browser only ever carries a one-time code, and the state, nonce and verifier
that tie it to this browser live in a short-lived HttpOnly cookie.
"""

import base64
import hashlib
import secrets
import time
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.api.guests import SessionDependency
from app.auth import (
    SESSION_COOKIE,
    CurrentUser,
    clear_session_cookie,
    end_session,
    set_session_cookie,
    start_session,
    uses_https,
)
from app.config import settings
from app.google_sign_in import (
    GoogleSignIn,
    GoogleSignInError,
    check_claims,
    get_google_sign_in,
    read_claims,
)
from app.models import UserAccount
from app.schemas import SignedInUser, SignedInUserUpdate

router = APIRouter(prefix="/api/auth", tags=["auth"])

GoogleDependency = Annotated[GoogleSignIn, Depends(get_google_sign_in)]

SIGN_IN_COOKIE = "la_bodita_sign_in"
SIGN_IN_MINUTES = 10


def to_login(error: str) -> RedirectResponse:
    """Back to the planner's login page, which explains the error in the couple's language."""
    return RedirectResponse(f"{settings.planner_url}/login?error={error}", status_code=status.HTTP_302_FOUND)


def code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


@router.get("/google/start")
def start_google_sign_in(google: GoogleDependency) -> RedirectResponse:
    if not settings.google_client_id or not settings.google_client_secret:
        return to_login("not_configured")

    state, nonce, verifier = (secrets.token_urlsafe(32) for _ in range(3))
    response = RedirectResponse(
        google.authorization_url(state, nonce, code_challenge(verifier)), status_code=status.HTTP_302_FOUND
    )
    # Lax, not Strict: it has to come back with Google's redirect, a cross-site navigation.
    # The three values are url-safe base64, so a dot cannot occur inside one.
    response.set_cookie(
        SIGN_IN_COOKIE,
        f"{state}.{nonce}.{verifier}",
        max_age=SIGN_IN_MINUTES * 60,
        path="/api/auth/google",
        httponly=True,
        secure=uses_https(),
        samesite="lax",
    )
    return response


@router.get("/google/callback")
def finish_google_sign_in(
    request: Request,
    session: SessionDependency,
    google: GoogleDependency,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    started = request.cookies.get(SIGN_IN_COOKIE, "").split(".")
    if len(started) != 3 or state is None or not secrets.compare_digest(state, started[0]):
        return finish(to_login("failed"))
    _, nonce, verifier = started
    if error is not None or code is None:
        return finish(to_login("cancelled" if error == "access_denied" else "failed"))

    try:
        email = check_claims(read_claims(google.exchange(code, verifier)), google.client_id, nonce, time.time())
    except GoogleSignInError:
        return finish(to_login("failed"))

    account = session.scalars(select(UserAccount).where(UserAccount.email == email.strip().lower())).first()
    if account is None:
        return finish(to_login("not_allowed"))

    response = finish(RedirectResponse(f"{settings.planner_url}/", status_code=status.HTTP_302_FOUND))
    set_session_cookie(response, start_session(session, account))
    return response


def finish(response: RedirectResponse) -> RedirectResponse:
    """A sign-in attempt is used up either way: its cookie cannot be replayed."""
    response.delete_cookie(SIGN_IN_COOKIE, path="/api/auth/google", httponly=True, secure=uses_https(), samesite="lax")
    return response


@router.get("/me", response_model=SignedInUser)
def read_signed_in_user(account: CurrentUser) -> UserAccount:
    return account


@router.patch("/me", response_model=SignedInUser)
def update_signed_in_user(payload: SignedInUserUpdate, account: CurrentUser, session: SessionDependency) -> UserAccount:
    """Rename yourself: the name the top bar and the papers table show."""
    account.display_name = payload.display_name
    session.commit()
    session.refresh(account)
    return account


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(request: Request, session: SessionDependency) -> Response:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        end_session(session, token)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response
