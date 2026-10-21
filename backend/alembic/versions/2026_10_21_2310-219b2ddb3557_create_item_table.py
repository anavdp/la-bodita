"""create item table

Revision ID: 219b2ddb3557
Revises: 976d6f292be0
Create Date: 2026-10-21 23:10:16.083188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '219b2ddb3557'
down_revision: Union[str, Sequence[str], None] = '976d6f292be0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Slice 4 (#28): the planning hub, with the details needed to track a vendor
    (status, contact, Instagram or website) so it can be used before the other screens.
    """
    op.create_table('item',
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('category_id', sa.Integer(), nullable=True),
    sa.Column('subcategory_id', sa.Integer(), nullable=True),
    sa.Column('status', sa.Enum('idea', 'contacted', 'meeting_set', 'booked', 'discarded', name='item_status', native_enum=False, length=20), nullable=False),
    sa.Column('contact_name', sa.String(), nullable=True),
    sa.Column('phone', sa.String(), nullable=True),
    sa.Column('email', sa.String(), nullable=True),
    sa.Column('instagram_url', sa.String(), nullable=True),
    sa.Column('website_url', sa.String(), nullable=True),
    sa.Column('notes', sa.String(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['category_id'], ['category.id'], name=op.f('fk_item_category_id_category'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['subcategory_id'], ['subcategory.id'], name=op.f('fk_item_subcategory_id_subcategory'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_item_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_item'))
    )
    with op.batch_alter_table('item', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_item_category_id'), ['category_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_item_subcategory_id'), ['subcategory_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_item_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('item', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_item_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_item_subcategory_id'))
        batch_op.drop_index(batch_op.f('ix_item_category_id'))

    op.drop_table('item')
