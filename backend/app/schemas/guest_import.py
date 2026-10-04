from pydantic import BaseModel

from app.schemas.guest import GuestFields, OptionalText


class GuestImportRowError(BaseModel):
    """What is wrong with one cell, as codes the UI turns into words in either language."""

    field: str
    code: str


class GuestImportGuest(GuestFields):
    """A spreadsheet guest. Rows of one file sharing a `household` value are invited
    together; a row without one is a household of one."""

    household: OptionalText | None = None


class GuestImportRow(BaseModel):
    """One spreadsheet row: the guest it would become, or why it cannot become one."""

    row_number: int
    guest: GuestImportGuest | None
    errors: list[GuestImportRowError]


class GuestImportPreview(BaseModel):
    rows: list[GuestImportRow]
