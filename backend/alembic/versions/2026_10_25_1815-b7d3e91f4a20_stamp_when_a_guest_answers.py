"""stamp when a guest answers

Revision ID: b7d3e91f4a20
Revises: 68428ff00a7d
Create Date: 2026-10-25 18:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d3e91f4a20'
down_revision: Union[str, Sequence[str], None] = '68428ff00a7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Guests who answered before the stamp existed take their last update as the
    moment they answered: guests are rarely edited after answering, so it is
    the closest record there is. Pending guests have not answered and stay empty.
    """
    with op.batch_alter_table('guest', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rsvp_answered_at', sa.DateTime(timezone=True), nullable=True))

    op.execute("update guest set rsvp_answered_at = updated_at where rsvp_status != 'pending'")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('guest', schema=None) as batch_op:
        batch_op.drop_column('rsvp_answered_at')
