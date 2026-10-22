from fastapi import APIRouter
from sqlalchemy import select

from app.api.guests import SessionDependency, WeddingDependency
from app.models import Wedding
from app.schemas import WeddingRead, WeddingUpdate

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
