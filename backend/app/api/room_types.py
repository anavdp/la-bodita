from fastapi import APIRouter, HTTPException, status
from sqlalchemy import exists, select

from app.api.guests import SessionDependency, WeddingDependency
from app.models import HouseholdRoom, RoomType
from app.schemas import RoomTypeCreate, RoomTypeRead, RoomTypeUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/room-types", tags=["room types"])


def get_scoped_room_type(room_type_id: int, wedding: WeddingDependency, session: SessionDependency) -> RoomType:
    room_type = session.get(RoomType, room_type_id)
    if room_type is None or room_type.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room type not found")
    return room_type


@router.get("", response_model=list[RoomTypeRead])
def list_room_types(wedding: WeddingDependency, session: SessionDependency) -> list[RoomType]:
    return list(session.scalars(select(RoomType).where(RoomType.wedding_id == wedding.id).order_by(RoomType.id)))


@router.post("", response_model=RoomTypeRead, status_code=status.HTTP_201_CREATED)
def create_room_type(payload: RoomTypeCreate, wedding: WeddingDependency, session: SessionDependency) -> RoomType:
    room_type = RoomType(wedding_id=wedding.id, **payload.model_dump())
    room_type.beds = room_type.beds or None
    session.add(room_type)
    session.commit()
    session.refresh(room_type)
    return room_type


@router.patch("/{room_type_id}", response_model=RoomTypeRead)
def update_room_type(
    room_type_id: int, payload: RoomTypeUpdate, wedding: WeddingDependency, session: SessionDependency
) -> RoomType:
    room_type = get_scoped_room_type(room_type_id, wedding, session)
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "beds" in changes:
        changes["beds"] = changes["beds"] or None
    for field, value in changes.items():
        setattr(room_type, field, value)
    session.commit()
    session.refresh(room_type)
    return room_type


@router.delete("/{room_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room_type(room_type_id: int, wedding: WeddingDependency, session: SessionDependency) -> None:
    """Refused while any household has this room type booked, so no booking vanishes quietly."""
    room_type = get_scoped_room_type(room_type_id, wedding, session)
    if session.scalar(select(exists().where(HouseholdRoom.room_type_id == room_type.id))):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room type is booked for a household")
    session.delete(room_type)
    session.commit()
