"""track household broadcast list

Revision ID: 6c2f8e4b7a19
Revises: 3a7e9b1d5c62
Create Date: 2026-10-21 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c2f8e4b7a19'
down_revision: Union[str, Sequence[str], None] = '3a7e9b1d5c62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BROADCAST_LIST = sa.Enum("bride", "groom", name="broadcast_list", native_enum=False, length=20)


def upgrade() -> None:
    """Upgrade schema.

    Invitations now go out through the couple's WhatsApp broadcast lists instead of
    individual RSVP links. Every existing household starts on no list.
    """
    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.add_column(sa.Column("broadcast_list", BROADCAST_LIST, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.drop_column("broadcast_list")
