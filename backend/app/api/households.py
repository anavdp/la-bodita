from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.guests import SessionDependency, WeddingDependency
from app.models import Household
from app.schemas import HouseholdRead

router = APIRouter(prefix="/api/weddings/{wedding_id}/households", tags=["households"])


@router.get("", response_model=list[HouseholdRead])
def list_households(wedding: WeddingDependency, session: SessionDependency) -> list[HouseholdRead]:
    statement = (
        select(Household)
        .where(Household.wedding_id == wedding.id)
        .options(selectinload(Household.guests))
        .order_by(Household.id)
    )
    return [
        HouseholdRead(
            id=household.id,
            name=household.name,
            rsvp_token=household.rsvp_token,
            guest_ids=[guest.id for guest in household.guests],
        )
        for household in session.scalars(statement)
    ]
