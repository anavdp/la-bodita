from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_session
from app.guest_import import (
    MAX_FILE_BYTES,
    GuestImportFileError,
    decode_upload,
    parse_guest_rows,
    template_csv,
)
from app.models import Guest, Household, Wedding
from app.models.guest import household_of_one
from app.schemas import GuestCreate, GuestImportGuest, GuestImportPreview, GuestRead, GuestUpdate

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


def find_household(session: Session, wedding: Wedding, household_id: int) -> Household:
    """A household named in a request body: a bad id is a bad payload, hence 422."""
    household = session.get(Household, household_id)
    if household is None or household.wedding_id != wedding.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Household not found"
        )
    return household


def remove_household_if_empty(session: Session, household_id: int) -> None:
    """A household exists for its guests; once the last one leaves, so does it."""
    members = session.scalar(
        select(func.count()).select_from(Guest).where(Guest.household_id == household_id)
    )
    if members == 0:
        session.delete(session.get(Household, household_id))
        session.commit()


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
    if payload.household_id is not None:
        find_household(session, wedding, payload.household_id)
    guest = Guest(wedding_id=wedding.id, **payload.model_dump())
    session.add(guest)
    session.commit()
    session.refresh(guest)
    return guest


@router.post("/bulk", response_model=list[GuestRead], status_code=status.HTTP_201_CREATED)
def create_guests(
    payload: Annotated[list[GuestImportGuest], Body(min_length=1)],
    wedding: WeddingDependency,
    session: SessionDependency,
) -> list[Guest]:
    """Confirms a CSV import: the rows the preview accepted, saved in one commit.

    Rows sharing a household value (matched ignoring case and surrounding spaces)
    are invited together; a row without one gets a household of one.

    Create-only by design - a guest already on the list is not matched, and
    neither is a household, so importing the same file twice lists everyone twice.
    """
    households: dict[str, Household] = {}
    guests = []
    for row in payload:
        fields = row.model_dump(exclude={"household"})
        guest = Guest(wedding_id=wedding.id, **fields)
        if row.household:
            key = row.household.casefold()
            if key not in households:
                households[key] = Household(wedding_id=wedding.id, name=row.household)
            guest.household = households[key]
        guests.append(guest)
    session.add_all(guests)
    session.commit()
    for guest in guests:
        session.refresh(guest)
    return guests


@router.get("/import/template")
def download_import_template(wedding: WeddingDependency) -> Response:
    return Response(
        content=template_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="guest-list-template.csv"'},
    )


@router.post("/import/preview", response_model=GuestImportPreview)
async def preview_import(file: UploadFile, wedding: WeddingDependency) -> GuestImportPreview:
    """Validates every row of an uploaded CSV without saving anything.

    Row problems come back per row, so one typo does not sink a 150-row file.
    Only a file that cannot be read at all is rejected outright.
    """
    try:
        text = decode_upload(await file.read(MAX_FILE_BYTES + 1))
        return GuestImportPreview(rows=parse_guest_rows(text))
    except GuestImportFileError as failure:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=failure.code
        ) from failure


@router.get("/{guest_id}", response_model=GuestRead)
def read_guest(guest: GuestDependency) -> Guest:
    return guest


@router.patch("/{guest_id}", response_model=GuestRead)
def update_guest(
    payload: GuestUpdate, guest: GuestDependency, wedding: WeddingDependency, session: SessionDependency
) -> Guest:
    changes = payload.model_dump(exclude_unset=True)
    previous_household_id = guest.household_id
    household_id = changes.pop("household_id", previous_household_id)
    for field, value in changes.items():
        setattr(guest, field, value)
    if household_id is None:
        guest.household = household_of_one(guest)
    elif household_id != previous_household_id:
        guest.household = find_household(session, wedding, household_id)
    session.commit()
    if guest.household_id != previous_household_id:
        remove_household_if_empty(session, previous_household_id)
    session.refresh(guest)
    return guest


@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(guest: GuestDependency, session: SessionDependency) -> None:
    household_id = guest.household_id
    session.delete(guest)
    session.commit()
    remove_household_if_empty(session, household_id)
