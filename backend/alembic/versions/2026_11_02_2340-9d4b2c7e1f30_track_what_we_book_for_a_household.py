"""track what we book for a household

Revision ID: 9d4b2c7e1f30
Revises: 3c877b2aa297
Create Date: 2026-11-02 23:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d4b2c7e1f30'
down_revision: Union[str, Sequence[str], None] = '3c877b2aa297'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Most guests book their own hotel and get around on their own; for a few
    households the couple books hotel rooms or arranges rides, noting who drives them. Every existing
    household starts with nothing booked.
    """
    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.add_column(sa.Column("hotel_rooms", sa.Integer(), server_default="0", nullable=False))
        batch_op.add_column(sa.Column("needs_ride", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column("ride_with", sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.drop_column("ride_with")
        batch_op.drop_column("needs_ride")
        batch_op.drop_column("hotel_rooms")
