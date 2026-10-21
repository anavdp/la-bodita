"""create requirement table

Revision ID: 81f236ad39af
Revises: 219b2ddb3557
Create Date: 2026-10-21 23:12:05.096125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81f236ad39af'
down_revision: Union[str, Sequence[str], None] = '219b2ddb3557'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Slice 5 (#29): checklist tasks, under an item or on their own. A due date and
    time make a task an appointment.
    """
    op.create_table('requirement',
    sa.Column('item_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('is_done', sa.Boolean(), server_default=sa.text('0'), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=True),
    sa.Column('due_time', sa.Time(), nullable=True),
    sa.Column('notes', sa.String(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], name=op.f('fk_requirement_item_id_item'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_requirement_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_requirement'))
    )
    with op.batch_alter_table('requirement', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_requirement_item_id'), ['item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_requirement_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('requirement', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_requirement_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_requirement_item_id'))

    op.drop_table('requirement')
