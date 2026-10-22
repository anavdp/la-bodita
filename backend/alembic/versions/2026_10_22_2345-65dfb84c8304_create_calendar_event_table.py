"""create calendar event table

Revision ID: 65dfb84c8304
Revises: 326fc47745a4
Create Date: 2026-10-22 23:45:55.598024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65dfb84c8304'
down_revision: Union[str, Sequence[str], None] = '326fc47745a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    The calendar slice: trips, fairs and other dated things that are not tasks,
    one day or a range, under an item or on their own.
    """
    op.create_table('calendar_event',
    sa.Column('item_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=True),
    sa.Column('start_time', sa.Time(), nullable=True),
    sa.Column('notes', sa.String(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], name=op.f('fk_calendar_event_item_id_item'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_calendar_event_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_calendar_event'))
    )
    with op.batch_alter_table('calendar_event', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_calendar_event_item_id'), ['item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_calendar_event_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('calendar_event', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_calendar_event_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_calendar_event_item_id'))

    op.drop_table('calendar_event')
