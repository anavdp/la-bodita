from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field, PlainSerializer, StringConstraints, model_validator

from app.models.budget_line import BudgetLineStatus
from app.schemas.category import reject_cleared
from app.schemas.requirement import Notes, Title

# Stored uppercase, so "eur" and "EUR" are the same currency.
Currency = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z]{3}$"), AfterValidator(str.upper)]
Amount = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
# JSON numbers, not strings: the screen adds them up.
AmountOut = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]


class BudgetLineCreate(BaseModel):
    title: Title
    item_id: int | None = None
    status: BudgetLineStatus = BudgetLineStatus.IDEA
    currency: Currency = "USD"
    estimated_amount: Amount | None = None
    actual_amount: Amount | None = None
    notes: Notes | None = None


class BudgetLineUpdate(BaseModel):
    """A partial update: an omitted field is left alone, an explicit null clears it."""

    title: Title | None = None
    item_id: int | None = None
    status: BudgetLineStatus | None = None
    currency: Currency | None = None
    estimated_amount: Amount | None = None
    actual_amount: Amount | None = None
    notes: Notes | None = None

    @model_validator(mode="after")
    def reject_nulls_for_required_fields(self) -> "BudgetLineUpdate":
        reject_cleared(self, ("title", "status", "currency"))
        return self


class BudgetLineRead(BaseModel):
    """A cost, with enough of its item to group it by category on the budget."""

    id: int
    title: str
    status: BudgetLineStatus
    currency: str
    estimated_amount: AmountOut | None
    actual_amount: AmountOut | None
    notes: str | None
    item_id: int | None
    item_name: str | None
    category_id: int | None
