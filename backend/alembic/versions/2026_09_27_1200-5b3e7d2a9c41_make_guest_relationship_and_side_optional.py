"""make guest relationship and side optional

Revision ID: 5b3e7d2a9c41
Revises: 1c9790e79368
Create Date: 2026-09-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b3e7d2a9c41'
down_revision: Union[str, Sequence[str], None] = '1c9790e79368'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RELATIONSHIP_TYPE = sa.Enum(
    "family", "friends", "other", name="relationship_type", native_enum=False, length=20
)
SIDE = sa.Enum(
    "venezuela", "italy", "spain", "other", name="side", native_enum=False, length=20
)


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.alter_column("relationship_type", existing_type=RELATIONSHIP_TYPE, nullable=True)
        batch_op.alter_column("side", existing_type=SIDE, nullable=True)


def downgrade() -> None:
    """Downgrade schema.

    Guests saved without a relationship or side have no value to fall back to, so
    they get "other" - the one answer that is true of anybody.
    """
    op.execute("UPDATE guest SET relationship_type = 'other' WHERE relationship_type IS NULL")
    op.execute("UPDATE guest SET side = 'other' WHERE side IS NULL")
    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.alter_column("relationship_type", existing_type=RELATIONSHIP_TYPE, nullable=False)
        batch_op.alter_column("side", existing_type=SIDE, nullable=False)
