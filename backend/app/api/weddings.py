from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import Wedding
from app.schemas import WeddingRead

router = APIRouter(prefix="/api/weddings", tags=["weddings"])


@router.get("", response_model=list[WeddingRead])
def list_weddings(session: Annotated[Session, Depends(get_session)]) -> list[Wedding]:
    """Exactly one row today; a list keeps the shape right when there are more."""
    return list(session.scalars(select(Wedding).order_by(Wedding.id)))
