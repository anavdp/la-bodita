"""book hotel rooms by type

Revision ID: aa25ef43322c
Revises: 9d4b2c7e1f30
Create Date: 2026-11-03 00:26:43.969291

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa25ef43322c'
down_revision: Union[str, Sequence[str], None] = '9d4b2c7e1f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Hotel rooms are booked by type (Junior King, Doble, suites...), each with how
    many the hotel holds, so the single room count per household gives way to a
    count per type. The count was only ever on an unmerged branch, so nothing is
    carried over.
    """
    op.create_table('room_type',
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('beds', sa.String(), nullable=True),
    sa.Column('available', sa.Integer(), server_default='0', nullable=False),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_room_type_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_room_type'))
    )
    with op.batch_alter_table('room_type', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_room_type_wedding_id'), ['wedding_id'], unique=False)

    op.create_table('household_room',
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('room_type_id', sa.Integer(), nullable=False),
    sa.Column('count', sa.Integer(), nullable=False),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['household_id'], ['household.id'], name=op.f('fk_household_room_household_id_household'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['room_type_id'], ['room_type.id'], name=op.f('fk_household_room_room_type_id_room_type'), ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_household_room_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_household_room')),
    sa.UniqueConstraint('household_id', 'room_type_id', name=op.f('uq_household_room_household_id_room_type_id'))
    )
    with op.batch_alter_table('household_room', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_household_room_household_id'), ['household_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_household_room_room_type_id'), ['room_type_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_household_room_wedding_id'), ['wedding_id'], unique=False)

    with op.batch_alter_table('household', schema=None) as batch_op:
        batch_op.drop_column('hotel_rooms')



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('household', schema=None) as batch_op:
        batch_op.add_column(sa.Column('hotel_rooms', sa.INTEGER(), server_default=sa.text("'0'"), nullable=False))

    with op.batch_alter_table('household_room', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_household_room_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_household_room_room_type_id'))
        batch_op.drop_index(batch_op.f('ix_household_room_household_id'))

    op.drop_table('household_room')
    with op.batch_alter_table('room_type', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_room_type_wedding_id'))

    op.drop_table('room_type')
