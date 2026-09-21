from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import Guest, Wedding
from app.schemas import GuestCreate, GuestRead, GuestUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/guests", tags=["guests"])

SessionDependency = Annotated[Session, Depends(get_session)]


def get_scoped_wedding(wedding_id: int, session: SessionDependency) -> Wedding:
    wedding = session.get(Wedding, wedding_id)
    if wedding is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wedding not found")
    return wedding


WeddingDependency = Annotated[Wedding, Depends(get_scoped_wedding)]


def get_scoped_guest(guest_id: int, wedding: WeddingDependency, session: SessionDependency) -> Guest:
    """A guest is only reachable through the wedding that owns it."""
    guest = session.get(Guest, guest_id)
    if guest is None or guest.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found")
    return guest


GuestDependency = Annotated[Guest, Depends(get_scoped_guest)]


@router.get("", response_model=list[GuestRead])
def list_guests(wedding: WeddingDependency, session: SessionDependency) -> list[Guest]:
    statement = (
        select(Guest)
        .where(Guest.wedding_id == wedding.id)
        .order_by(Guest.last_name, Guest.first_name, Guest.id)
    )
    return list(session.scalars(statement))


@router.post("", response_model=GuestRead, status_code=status.HTTP_201_CREATED)
def create_guest(payload: GuestCreate, wedding: WeddingDependency, session: SessionDependency) -> Guest:
    guest = Guest(wedding_id=wedding.id, **payload.model_dump())
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return guest


@router.get("/{guest_id}", response_model=GuestRead)
def read_guest(guest: GuestDependency) -> Guest:
    return guest


@router.patch("/{guest_id}", response_model=GuestRead)
def update_guest(payload: GuestUpdate, guest: GuestDependency, session: SessionDependency) -> Guest:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(guest, field, value)
    session.commit()
    session.refresh(guest)
    return guest


@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(guest: GuestDependency, session: SessionDependency) -> None:
    session.delete(guest)
    session.commit()
