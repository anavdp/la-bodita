"""create paper request table

Revision ID: 3c877b2aa297
Revises: e86f925dbaea
Create Date: 2026-10-25 18:36:13.857565

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c877b2aa297'
down_revision: Union[str, Sequence[str], None] = 'e86f925dbaea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    The papers an item asks for, each missing until an uploaded paper answers it.
    """
    op.create_table('paper_request',
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('requirement_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('person_id', sa.Integer(), nullable=True),
    sa.Column('document_id', sa.Integer(), nullable=True),
    sa.Column('wedding_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['document_id'], ['document.id'], name=op.f('fk_paper_request_document_id_document'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['item_id'], ['item.id'], name=op.f('fk_paper_request_item_id_item'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['person_id'], ['user_account.id'], name=op.f('fk_paper_request_person_id_user_account'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['requirement_id'], ['requirement.id'], name=op.f('fk_paper_request_requirement_id_requirement'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['wedding_id'], ['wedding.id'], name=op.f('fk_paper_request_wedding_id_wedding'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_paper_request'))
    )
    with op.batch_alter_table('paper_request', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_paper_request_document_id'), ['document_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_paper_request_item_id'), ['item_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_paper_request_person_id'), ['person_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_paper_request_requirement_id'), ['requirement_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_paper_request_wedding_id'), ['wedding_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('paper_request', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_paper_request_wedding_id'))
        batch_op.drop_index(batch_op.f('ix_paper_request_requirement_id'))
        batch_op.drop_index(batch_op.f('ix_paper_request_person_id'))
        batch_op.drop_index(batch_op.f('ix_paper_request_item_id'))
        batch_op.drop_index(batch_op.f('ix_paper_request_document_id'))

    op.drop_table('paper_request')
