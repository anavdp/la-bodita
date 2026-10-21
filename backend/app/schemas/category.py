from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, StringConstraints, model_validator

from app.schemas.guest import RequiredText

Emoji = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=16)]
# Stored lowercase so the same color is always spelled the same way.
HexColor = Annotated[
    str, StringConstraints(strip_whitespace=True, pattern=r"^#[0-9a-fA-F]{6}$"), AfterValidator(str.lower)
]


def reject_cleared(model: BaseModel, fields: tuple[str, ...]) -> None:
    """A PATCH may leave a required field alone, never blank it."""
    blanked = [field for field in fields if field in model.model_fields_set and getattr(model, field) is None]
    if blanked:
        raise ValueError(f"these fields cannot be cleared: {', '.join(blanked)}")


class SubcategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    emoji: str | None
    color: str


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str | None
    color: str
    subcategories: list[SubcategoryRead]


class CategoryCreate(BaseModel):
    name: RequiredText
    emoji: Emoji | None = None
    color: HexColor


class CategoryUpdate(BaseModel):
    """A partial update: an omitted field is left alone; only the emoji can be cleared."""

    name: RequiredText | None = None
    emoji: Emoji | None = None
    color: HexColor | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "CategoryUpdate":
        reject_cleared(self, ("name", "color"))
        return self


class SubcategoryCreate(BaseModel):
    """No color: a subcategory always wears its category's."""

    name: RequiredText
    emoji: Emoji | None = None


class SubcategoryUpdate(BaseModel):
    name: RequiredText | None = None
    emoji: Emoji | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "SubcategoryUpdate":
        reject_cleared(self, ("name",))
        return self
