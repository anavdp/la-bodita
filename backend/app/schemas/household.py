from datetime import date
from typing import Annotated

from pydantic import BaseModel, Field

from app.models.guest import RsvpStatus
from app.schemas.guest import RequiredText

# A household exists for its guests: it is created with at least one, and to
# empty it you delete it.
Members = Annotated[list[int], Field(min_length=1)]


class HouseholdRead(BaseModel):
    """A household as the guest list needs it: who is in it, and their private RSVP link."""

    id: int
    name: str
    rsvp_token: str
    guest_ids: list[int]


class HouseholdCreate(BaseModel):
    """A household and who is in it; guests listed move out of wherever they were."""

    name: RequiredText
    guest_ids: Members


class HouseholdUpdate(BaseModel):
    """A rename, a new membership, or both. `guest_ids` is the full list of members:
    newcomers move in, and anyone left out splits off into a household of their own."""

    name: RequiredText | None = None
    guest_ids: Members | None = None


class RsvpGuest(BaseModel):
    """Only what a household sees about itself - no contact details, no notes."""

    id: int
    first_name: str
    last_name: str
    rsvp_status: RsvpStatus


class RsvpInvitation(BaseModel):
    household_name: str
    wedding_name: str
    wedding_date: date | None
    guests: list[RsvpGuest]


class RsvpAnswer(BaseModel):
    guest_id: int
    attending: bool


class RsvpReply(BaseModel):
    answers: list[RsvpAnswer] = Field(min_length=1)


class RsvpLookup(BaseModel):
    """A guest finding their invitation by name: both halves, so a first name alone finds no one."""

    first_name: RequiredText
    last_name: RequiredText


class RsvpLookupMember(BaseModel):
    """Names only: enough to recognise your own household, nothing a stranger should learn."""

    first_name: str
    last_name: str


class RsvpLookupHousehold(BaseModel):
    token: str
    name: str
    members: list[RsvpLookupMember]


class RsvpLookupResult(BaseModel):
    households: list[RsvpLookupHousehold]
