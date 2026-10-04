"""The one part of the API a guest reaches: their household's private RSVP link.

The token in the path is the whole credential - long and random, so it cannot
be guessed - and it only ever opens its own household.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.guests import SessionDependency
from app.models import Household, Wedding
from app.models.guest import RsvpStatus
from app.schemas import RsvpGuest, RsvpInvitation, RsvpReply

router = APIRouter(prefix="/api/rsvp", tags=["rsvp"])


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
