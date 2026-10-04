from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from app.models.guest import GuestGender, GuestRelationshipType, GuestSide, RsvpStatus

RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
OptionalText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]

# Columns a guest cannot be without: a PATCH may leave them alone, never blank them.
REQUIRED_FIELDS = (
    "first_name",
    "last_name",
    "is_child",
    "rsvp_status",
)


class GuestCreate(BaseModel):
    first_name: RequiredText
    last_name: RequiredText
    relationship_type: GuestRelationshipType | None = None
    side: GuestSide | None = None
    is_child: bool = False
    gender: GuestGender | None = None
    rsvp_status: RsvpStatus = RsvpStatus.PENDING
    phone: OptionalText | None = None
    email: OptionalText | None = None


class GuestUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it."""

    first_name: RequiredText | None = None
    last_name: RequiredText | None = None
    relationship_type: GuestRelationshipType | None = None
    side: GuestSide | None = None
    is_child: bool | None = None
    gender: GuestGender | None = None
    rsvp_status: RsvpStatus | None = None
    phone: OptionalText | None = None
    email: OptionalText | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "GuestUpdate":
        blanked = [
            field
            for field in REQUIRED_FIELDS
            if field in self.model_fields_set and getattr(self, field) is None
        ]
        if blanked:
            raise ValueError(f"these fields cannot be cleared: {', '.join(blanked)}")
        return self


class GuestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wedding_id: int
    first_name: str
    last_name: str
    is_child: bool
    gender: GuestGender | None
    relationship_type: GuestRelationshipType | None
    side: GuestSide | None
    rsvp_status: RsvpStatus
    phone: str | None
    email: str | None
    created_at: datetime
    updated_at: datetime
