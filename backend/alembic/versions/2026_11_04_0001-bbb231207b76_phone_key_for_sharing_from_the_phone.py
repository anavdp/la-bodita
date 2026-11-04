"""phone key for sharing from the phone

Revision ID: bbb231207b76
Revises: aa25ef43322c
Create Date: 2026-11-04 00:01:20.884522

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbb231207b76'
down_revision: Union[str, Sequence[str], None] = 'aa25ef43322c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    A phone key per person lets the iOS share Shortcut send files in (#43).
    Only its hash is kept, like a session's.
    """
    with op.batch_alter_table('user_account', schema=None) as batch_op:
        batch_op.add_column(sa.Column('phone_key_hash', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('phone_key_created_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_unique_constraint(batch_op.f('uq_user_account_phone_key_hash'), ['phone_key_hash'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('user_account', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('uq_user_account_phone_key_hash'), type_='unique')
        batch_op.drop_column('phone_key_created_at')
        batch_op.drop_column('phone_key_hash')
