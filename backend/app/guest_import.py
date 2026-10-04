"""Reading a guest list out of the fixed-template CSV.

The template is deliberately fixed rather than mapped: the couple downloads it,
fills it in, and uploads it back. Every row is validated with the same guest fields
a single manual add goes through, so there is one definition of a valid guest. Parsing never touches the database - saving is a separate step,
after the couple has seen the preview.
"""

import csv
import io

from pydantic import ValidationError

from app.schemas.guest_import import GuestImportGuest, GuestImportRow, GuestImportRowError

TEMPLATE_COLUMNS = (
    "first_name",
    "last_name",
    "is_child",
    "gender",
    "relationship_type",
    "side",
    "phone",
    "email",
    "household",
)
REQUIRED_COLUMNS = ("first_name", "last_name")
# Matched case-insensitively: a spreadsheet user writes "Italy", the API says "italy".
LOWERCASED_COLUMNS = ("is_child", "gender", "relationship_type", "side")

# A 150-guest list is a few kilobytes; anything near this is not a guest list.
MAX_FILE_BYTES = 1_048_576

ERROR_CODES = {"missing": "missing", "string_too_short": "missing", "string_too_long": "too_long"}


class GuestImportFileError(ValueError):
    """The file as a whole cannot be read; `code` says why, for the UI to translate."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def template_csv() -> str:
    return ",".join(TEMPLATE_COLUMNS) + "\r\n"


def decode_upload(content: bytes) -> str:
    if len(content) > MAX_FILE_BYTES:
        raise GuestImportFileError("csv_too_large")
    try:
        # utf-8-sig drops the byte order mark Excel puts at the start of a CSV.
        return content.decode("utf-8-sig")
    except UnicodeDecodeError as failure:
        raise GuestImportFileError("csv_not_utf8") from failure


def parse_guest_rows(text: str) -> list[GuestImportRow]:
    reader = csv.reader(io.StringIO(text))
    header = [column.strip().lower() for column in next(reader, [])]
    if not all(column in header for column in REQUIRED_COLUMNS):
        raise GuestImportFileError("csv_missing_columns")

    # Columns outside the template are ignored rather than rejected, so a notes
    # column the couple keeps for themselves does not block the import.
    positions = {column: header.index(column) for column in TEMPLATE_COLUMNS if column in header}

    rows = []
    # Numbered like the spreadsheet: the header is row 1. Enumerating rather than
    # counting parsed rows keeps the numbers right across skipped blank lines.
    for row_number, cells in enumerate(reader, start=2):
        values = {
            column: cells[position].strip()
            for column, position in positions.items()
            if position < len(cells) and cells[position].strip() != ""
        }
        if not values:
            continue
        for column in LOWERCASED_COLUMNS:
            if column in values:
                values[column] = values[column].lower()
        rows.append(validate_row(row_number, values))
    return rows


def validate_row(row_number: int, values: dict[str, str]) -> GuestImportRow:
    try:
        guest = GuestImportGuest.model_validate(values)
    except ValidationError as failure:
        errors = sorted(
            (
                GuestImportRowError(
                    field=str(error["loc"][0]), code=ERROR_CODES.get(error["type"], "invalid")
                )
                for error in failure.errors()
            ),
            key=lambda error: TEMPLATE_COLUMNS.index(error.field),
        )
        return GuestImportRow(row_number=row_number, guest=None, errors=errors)
    return GuestImportRow(row_number=row_number, guest=guest, errors=[])
