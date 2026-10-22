"""create budget line table

Revision ID: 326fc47745a4
Revises: 81f236ad39af
Create Date: 2026-10-22 22:54:42.583483

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '326fc47745a4'
down_revision: Union[str, Sequence[str], None] = '81f236ad39af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    The budget slice: costs and quotes, under an item or on their own. Several
    alternatives per category are switched on and off by status.
    """
    op.create_table('budget_line',
    sa.Column('item_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('status', sa.Enum('idea', 'considering', 'confirmed', 'paid', name='budget_line_status', native_enum=False, length=20), nullable=False),
    sa.Column('currency', sa.String(length=3), server_default='USD', nullable=False),
    sa.Column('estimated_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('actual_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('notes', sa.String(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], name=op.f('fk_budget_line_item_id_item'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_budget_line_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_budget_line'))
    )
    with op.batch_alter_table('budget_line', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_budget_line_item_id'), ['item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_budget_line_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('budget_line', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_budget_line_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_budget_line_item_id'))

    op.drop_table('budget_line')
