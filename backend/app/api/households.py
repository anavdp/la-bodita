from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.guests import SessionDependency, WeddingDependency, remove_household_if_empty
from app.models import Guest, Household, HouseholdRoom, RoomType, Wedding
from app.models.guest import household_of_one
from app.schemas import BookedRooms, HouseholdCreate, HouseholdRead, HouseholdUpdate

router = APIRouter(prefix="/api/weddings/{wedding_id}/households", tags=["households"])


def to_read(household: Household) -> HouseholdRead:
    return HouseholdRead(
        id=household.id,
        name=household.name,
        rsvp_token=household.rsvp_token,
        broadcast_list=household.broadcast_list,
        rooms=[BookedRooms.model_validate(room) for room in household.rooms],
        needs_ride=household.needs_ride,
        ride_with=household.ride_with,
        guest_ids=[guest.id for guest in household.guests],
    )


def get_scoped_household(household_id: int, wedding: WeddingDependency, session: SessionDependency) -> Household:
    household = session.get(Household, household_id)
    if household is None or household.wedding_id != wedding.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return household


def find_guests(session: SessionDependency, wedding: Wedding, guest_ids: list[int]) -> list[Guest]:
    """Guests named in a request body, all of this wedding - or a 422 before anything moves."""
    guests = list(session.scalars(select(Guest).where(Guest.id.in_(guest_ids))))
    if len(guests) != len(set(guest_ids)) or any(guest.wedding_id != wedding.id for guest in guests):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Guest not found")
    return guests


def book_rooms(session: SessionDependency, household: Household, rooms: list[BookedRooms]) -> None:
    """Replaces what is booked for the household; room types must be this wedding's."""
    wanted = [room for room in rooms if room.count > 0]
    type_ids = {room.room_type_id for room in wanted}
    found = set(session.scalars(select(RoomType.id).where(RoomType.id.in_(type_ids), RoomType.wedding_id == household.wedding_id)))
    if found != type_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Room type not found")
    household.rooms.clear()
    session.flush()
    for room in wanted:
        household.rooms.append(
            HouseholdRoom(wedding_id=household.wedding_id, room_type_id=room.room_type_id, count=room.count)
        )


def move_into(session: SessionDependency, household: Household, guests: list[Guest]) -> None:
    """Moves guests in and commits; a household a guest left empty goes too."""
    left_behind = {guest.household_id for guest in guests} - {household.id}
    for guest in guests:
        guest.household = household
    session.commit()
    for household_id in left_behind:
        remove_household_if_empty(session, household_id)


@router.get("", response_model=list[HouseholdRead])
def list_households(wedding: WeddingDependency, session: SessionDependency) -> list[HouseholdRead]:
    statement = (
        select(Household)
        .where(Household.wedding_id == wedding.id)
        .options(selectinload(Household.guests), selectinload(Household.rooms))
        .order_by(Household.name, Household.id)
    )
    return [to_read(household) for household in session.scalars(statement)]


@router.post("", response_model=HouseholdRead, status_code=status.HTTP_201_CREATED)
def create_household(
    payload: HouseholdCreate, wedding: WeddingDependency, session: SessionDependency
) -> HouseholdRead:
    guests = find_guests(session, wedding, payload.guest_ids)
    household = Household(wedding_id=wedding.id, name=payload.name)
    session.add(household)
    move_into(session, household, guests)
    session.refresh(household)
    return to_read(household)


@router.patch("/{household_id}", response_model=HouseholdRead)
def update_household(
    household_id: int, payload: HouseholdUpdate, wedding: WeddingDependency, session: SessionDependency
) -> HouseholdRead:
    household = get_scoped_household(household_id, wedding, session)
    if payload.name is not None:
        household.name = payload.name
    # Null is a real answer here ("on no list"), so only a field left out is ignored.
    if "broadcast_list" in payload.model_fields_set:
        household.broadcast_list = payload.broadcast_list
    if payload.rooms is not None:
        book_rooms(session, household, payload.rooms)
    if payload.ride_with is not None:
        household.ride_with = payload.ride_with or None
    if payload.needs_ride is not None:
        household.needs_ride = payload.needs_ride
    # A driver only means something while the household needs a ride.
    if not household.needs_ride:
        household.ride_with = None
    if payload.guest_ids is not None:
        members = find_guests(session, wedding, payload.guest_ids)
        for guest in household.guests:
            if guest.id not in payload.guest_ids:
                guest.household = household_of_one(guest)
        move_into(session, household, members)
    session.commit()
    session.refresh(household)
    return to_read(household)


@router.delete("/{household_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_household(
    household_id: int,
    wedding: WeddingDependency,
    session: SessionDependency,
    delete_guests: bool = False,
) -> None:
    """Deletes the household and, if asked, its guests. Kept guests are not left
    without a household: each one goes on to a household of their own."""
    household = get_scoped_household(household_id, wedding, session)
    for guest in list(household.guests):
        if delete_guests:
            session.delete(guest)
        else:
            guest.household = household_of_one(guest)
    session.flush()
    session.delete(household)
    session.commit()
