"""create category and subcategory tables

Revision ID: 976d6f292be0
Revises: 6c2f8e4b7a19
Create Date: 2026-10-21 23:08:08.298064

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '976d6f292be0'
down_revision: Union[str, Sequence[str], None] = '6c2f8e4b7a19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Slice 3 (#27): the couple's own tags. No seed rows - they build the list themselves.
    """
    op.create_table('category',
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('emoji', sa.String(), nullable=True),
    sa.Column('color', sa.String(), nullable=False),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_category_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_category'))
    )
    with op.batch_alter_table('category', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_category_wedding_id'), ['wedding_id'], unique=False)

    op.create_table('subcategory',
    sa.Column('category_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('emoji', sa.String(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['category_id'], ['category.id'], name=op.f('fk_subcategory_category_id_category'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_subcategory_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_subcategory'))
    )
    with op.batch_alter_table('subcategory', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_subcategory_category_id'), ['category_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_subcategory_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('subcategory', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_subcategory_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_subcategory_category_id'))

    op.drop_table('subcategory')
    with op.batch_alter_table('category', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_category_wedding_id'))

    op.drop_table('category')
