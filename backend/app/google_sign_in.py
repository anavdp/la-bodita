"""Google's half of signing in: where to send the browser, and turning the code
it comes back with into Google's statement of who signed in.

The code is exchanged server to server, over TLS, with the client secret and the
PKCE verifier, so the ID token comes straight from Google. OpenID Connect lets a
token received that way skip the signature check (Core 1.0, section 3.1.3.7);
its claims are still checked one by one in `app.auth`.
"""

import base64
import json
import secrets
from urllib.parse import urlencode

import httpx

from app.config import settings

AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
CALLBACK_PATH = "/api/auth/google/callback"


class GoogleSignInError(Exception):
    """Google did not vouch for anyone: the code was refused or the answer was not a sign-in."""


class GoogleSignIn:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.transport = transport

    def authorization_url(self, state: str, nonce: str, code_challenge: str) -> str:
        query = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "nonce": nonce,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            # Lets someone signed in to several Google accounts pick the right one.
            "prompt": "select_account",
        }
        return f"{AUTHORIZATION_ENDPOINT}?{urlencode(query)}"

    def exchange(self, code: str, code_verifier: str) -> str:
        """The ID token Google issues for this code."""
        with httpx.Client(transport=self.transport, timeout=10) as client:
            response = client.post(
                TOKEN_ENDPOINT,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "code_verifier": code_verifier,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                },
            )
        try:
            response.raise_for_status()
            return response.json()["id_token"]
        except (httpx.HTTPStatusError, ValueError, KeyError) as error:
            raise GoogleSignInError(f"Google refused the sign-in code ({response.status_code})") from error


def read_claims(id_token: str) -> dict:
    """The claims an ID token carries, unverified: the caller checks each one it relies on."""
    try:
        payload = id_token.split(".")[1]
        return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    except (IndexError, ValueError) as error:
        raise GoogleSignInError("Google's answer was not an ID token") from error


def check_claims(claims: dict, client_id: str, nonce: str, now: float) -> str:
    """The verified email the token vouches for, or an error naming the check it failed."""
    if claims.get("iss") not in ISSUERS:
        raise GoogleSignInError("the token was not issued by Google")
    if claims.get("aud") != client_id:
        raise GoogleSignInError("the token was issued to another app")
    if not isinstance(claims.get("exp"), (int, float)) or claims["exp"] <= now:
        raise GoogleSignInError("the token has expired")
    # Ties the token to the sign-in this browser started, so an old one cannot be replayed.
    if not secrets.compare_digest(str(claims.get("nonce", "")), nonce):
        raise GoogleSignInError("the token belongs to another sign-in")
    if claims.get("email_verified") is not True or not claims.get("email"):
        raise GoogleSignInError("Google has not verified this email")
    return claims["email"]


def get_google_sign_in() -> GoogleSignIn:
    return GoogleSignIn(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=f"{settings.api_url}{CALLBACK_PATH}",
    )
