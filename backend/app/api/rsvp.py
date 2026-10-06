"""The one part of the API a guest reaches: their household's private RSVP link.

The token in the path is the whole credential - long and random, so it cannot
be guessed - and it only ever opens its own household. A guest without their
link can find it by name, which is why that lookup is rate limited and answers
with names only.
"""

import unicodedata

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.guests import SessionDependency
from app.models import Guest, Household, Wedding
from app.models.guest import RsvpStatus
from app.rate_limit import SlidingWindowRateLimit
from app.schemas import (
    RsvpGuest,
    RsvpInvitation,
    RsvpLookup,
    RsvpLookupHousehold,
    RsvpLookupMember,
    RsvpLookupResult,
    RsvpReply,
)

router = APIRouter(prefix="/api/rsvp", tags=["rsvp"])

LOOKUPS_PER_MINUTE = 10
lookup_rate_limit = SlidingWindowRateLimit(max_calls=LOOKUPS_PER_MINUTE, window_seconds=60)


def comparable(name: str) -> str:
    """A name as a guest might type it: any case, accents or not, stray spaces."""
    without_accents = "".join(
        character
        for character in unicodedata.normalize("NFKD", name)
        if not unicodedata.combining(character)
    )
    return " ".join(without_accents.casefold().split())


# Words that join a compound last name: typed alone they would match half the list.
PARTICLES = {"de", "del", "la", "las", "los", "y", "da", "di", "do", "dos", "van", "von"}


def last_name_matches(typed_words: set[str], stored: str) -> bool:
    """Whole words either way: "Palma" or "De Palma" for "De Palma", and "De Palma Aponte"
    (both of someone's last names) for a guest stored as just "De Palma"."""
    stored_words = set(stored.split())
    if not typed_words - PARTICLES:
        return False
    return typed_words <= stored_words or stored_words <= typed_words


def name_matches(typed: str, first_name: str, last_name: str) -> bool:
    """At least one of the guest's first names, and the rest of what was typed as their last name."""
    typed_words, first_names = set(typed.split()), set(first_name.split())
    return bool(typed_words & first_names) and last_name_matches(typed_words - first_names, last_name)


@router.post("/lookup", response_model=RsvpLookupResult)
def look_up_invitation(lookup: RsvpLookup, request: Request, session: SessionDependency) -> RsvpLookupResult:
    """The households of every guest with this name - several when two people share it."""
    client = request.client.host if request.client else "unknown"
    if not lookup_rate_limit.allow(client):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many lookups, try again in a minute",
            headers={"Retry-After": "60"},
        )

    typed = comparable(lookup.name)
    # A wedding's guest list is a few hundred rows: matching in Python keeps the
    # accent folding in one place instead of teaching it to SQLite.
    guests = session.scalars(select(Guest).options(selectinload(Guest.household).selectinload(Household.guests)))
    households: dict[int, Household] = {}
    for guest in guests:
        if name_matches(typed, comparable(guest.first_name), comparable(guest.last_name)):
            households.setdefault(guest.household_id, guest.household)

    return RsvpLookupResult(
        households=[
            RsvpLookupHousehold(
                token=household.rsvp_token,
                name=household.name,
                members=[
                    RsvpLookupMember(first_name=member.first_name, last_name=member.last_name)
                    for member in household.guests
                ],
            )
            for household in households.values()
        ]
    )


def find_by_token(session: SessionDependency, token: str) -> Household:
    household = session.scalars(select(Household).where(Household.rsvp_token == token)).first()
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    return household


def invitation_for(session: SessionDependency, household: Household) -> RsvpInvitation:
    wedding = session.get(Wedding, household.wedding_id)
    return RsvpInvitation(
        household_name=household.name,
        wedding_name=wedding.name,
        wedding_date=wedding.wedding_date,
        guests=[RsvpGuest.model_validate(guest, from_attributes=True) for guest in household.guests],
    )


@router.get("/{token}", response_model=RsvpInvitation)
def read_invitation(token: str, session: SessionDependency) -> RsvpInvitation:
    return invitation_for(session, find_by_token(session, token))


@router.put("/{token}", response_model=RsvpInvitation)
def answer_invitation(token: str, reply: RsvpReply, session: SessionDependency) -> RsvpInvitation:
    """Each member answers for themselves; members left out of the reply keep their answer."""
    household = find_by_token(session, token)
    members = {guest.id: guest for guest in household.guests}
    if any(answer.guest_id not in members for answer in reply.answers):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Guest not in this household"
        )
    for answer in reply.answers:
        members[answer.guest_id].rsvp_status = (
            RsvpStatus.CONFIRMED if answer.attending else RsvpStatus.DECLINED
        )
    session.commit()
    return invitation_for(session, household)
