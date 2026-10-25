from fastapi import APIRouter
from sqlalchemy import select

from app.api.guests import SessionDependency, WeddingDependency
from app.models import UserAccount, Wedding
from app.schemas import Person, WeddingRead, WeddingUpdate

router = APIRouter(prefix="/api/weddings", tags=["weddings"])


@router.get("", response_model=list[WeddingRead])
def list_weddings(session: SessionDependency) -> list[Wedding]:
    """Exactly one row today; a list keeps the shape right when there are more."""
    return list(session.scalars(select(Wedding).order_by(Wedding.id)))


@router.patch("/{wedding_id}", response_model=WeddingRead)
def update_wedding(payload: WeddingUpdate, wedding: WeddingDependency, session: SessionDependency) -> Wedding:
    """Settings: the name the sidebar and invitations show, and the date the countdown counts to."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(wedding, field, value)
    session.commit()
    session.refresh(wedding)
    return wedding


@router.get("/{wedding_id}/people", response_model=list[Person])
def list_people(wedding: WeddingDependency, session: SessionDependency) -> list[UserAccount]:
    """The two of us, in the order we were added: the columns of the papers table."""
    return list(session.scalars(select(UserAccount).where(UserAccount.wedding_id == wedding.id).order_by(UserAccount.id)))
