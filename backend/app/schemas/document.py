from datetime import date, datetime

from pydantic import BaseModel, model_validator

from app.models.document import DocumentKind
from app.schemas.category import reject_cleared
from app.schemas.requirement import Title


class DocumentUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it.

    The file itself never changes: a new version is a new upload.
    """

    title: Title | None = None
    kind: DocumentKind | None = None
    item_id: int | None = None
    requirement_id: int | None = None
    person_id: int | None = None
    issued_on: date | None = None
    expires_on: date | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "DocumentUpdate":
        reject_cleared(self, ("title", "kind"))
        return self


class DocumentRead(BaseModel):
    """A file as the planner shows it, with enough of its item and task to shelve it.

    Where it sits in the bucket is never sent: the file is opened through the API.
    """

    id: int
    title: str
    kind: DocumentKind
    file_name: str
    content_type: str
    size_bytes: int
    item_id: int | None
    item_name: str | None
    category_id: int | None
    requirement_id: int | None
    requirement_title: str | None
    person_id: int | None
    issued_on: date | None
    expires_on: date | None
    uploaded_by_id: int | None
    created_at: datetime
