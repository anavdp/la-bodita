from pydantic import BaseModel

from app.schemas.guest import GuestCreate


class GuestImportRowError(BaseModel):
    """What is wrong with one cell, as codes the UI turns into words in either language."""

    field: str
    code: str


class GuestImportRow(BaseModel):
    """One spreadsheet row: the guest it would become, or why it cannot become one."""

    row_number: int
    guest: GuestCreate | None
    errors: list[GuestImportRowError]


class GuestImportPreview(BaseModel):
    rows: list[GuestImportRow]
