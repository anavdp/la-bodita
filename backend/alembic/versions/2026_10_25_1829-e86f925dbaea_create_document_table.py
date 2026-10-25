"""create document table

Revision ID: e86f925dbaea
Revises: 68428ff00a7d
Create Date: 2026-10-25 18:29:28.532736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e86f925dbaea'
down_revision: Union[str, Sequence[str], None] = '68428ff00a7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    The documents slice: uploaded photos and papers, on an item, a task of it, or
    on their own. The bytes live in the private bucket; this table is what the
    planner shows.
    """
    op.create_table('document',
    sa.Column('item_id', sa.Integer(), nullable=True),
    sa.Column('requirement_id', sa.Integer(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('kind', sa.Enum('photo', 'paper', name='document_kind', native_enum=False, length=20), nullable=False),
    sa.Column('file_name', sa.String(), nullable=False),
    sa.Column('content_type', sa.String(), nullable=False),
    sa.Column('size_bytes', sa.Integer(), nullable=False),
    sa.Column('storage_key', sa.String(), nullable=False),
    sa.Column('person_id', sa.Integer(), nullable=True),
    sa.Column('issued_on', sa.Date(), nullable=True),
    sa.Column('expires_on', sa.Date(), nullable=True),
    sa.Column('uploaded_by_id', sa.Integer(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], name=op.f('fk_document_item_id_item'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['person_id'], ['user_account.id'], name=op.f('fk_document_person_id_user_account'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['requirement_id'], ['requirement.id'], name=op.f('fk_document_requirement_id_requirement'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['uploaded_by_id'], ['user_account.id'], name=op.f('fk_document_uploaded_by_id_user_account'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_document_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_document')),
    sa.UniqueConstraint('storage_key', name=op.f('uq_document_storage_key'))
    )
    with op.batch_alter_table('document', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_document_item_id'), ['item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_document_person_id'), ['person_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_document_requirement_id'), ['requirement_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_document_uploaded_by_id'), ['uploaded_by_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_document_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('document', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_document_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_document_uploaded_by_id'))
        batch_op.drop_index(batch_op.f('ix_document_requirement_id'))
        batch_op.drop_index(batch_op.f('ix_document_person_id'))
        batch_op.drop_index(batch_op.f('ix_document_item_id'))

    op.drop_table('document')
