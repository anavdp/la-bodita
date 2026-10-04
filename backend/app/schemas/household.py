from datetime import date

from pydantic import BaseModel, Field

from app.models.guest import RsvpStatus


class HouseholdRead(BaseModel):
    """A household as the guest list needs it: who is in it, and their private RSVP link."""

    id: int
    name: str | None
    rsvp_token: str
    guest_ids: list[int]


class RsvpGuest(BaseModel):
    """Only what a household sees about itself - no contact details, no notes."""

    id: int
    first_name: str
    last_name: str
    rsvp_status: RsvpStatus


class RsvpInvitation(BaseModel):
    household_name: str | None
    wedding_name: str
    wedding_date: date | None
    guests: list[RsvpGuest]


class RsvpAnswer(BaseModel):
    guest_id: int
    attending: bool


class RsvpReply(BaseModel):
    answers: list[RsvpAnswer] = Field(min_length=1)
