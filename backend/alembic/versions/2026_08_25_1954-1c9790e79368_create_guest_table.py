"""create guest table

Revision ID: 1c9790e79368
Revises: 1fea8ee535b2
Create Date: 2026-08-25 19:54:30.707411

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c9790e79368'
down_revision: Union[str, Sequence[str], None] = '1fea8ee535b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "guest",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("wedding_id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("is_child", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "gender",
            sa.Enum("female", "male", "other", name="gender", native_enum=False, length=20),
            nullable=True,
        ),
        sa.Column(
            "relationship_type",
            sa.Enum(
                "family",
                "friends",
                "other",
                name="relationship_type",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "side",
            sa.Enum(
                "venezuela",
                "italy",
                "spain",
                "other",
                name="side",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "rsvp_status",
            sa.Enum(
                "pending",
                "confirmed",
                "declined",
                name="rsvp_status",
                native_enum=False,
                length=20,
            ),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["wedding_id"],
            ["wedding.id"],
            name=op.f("fk_guest_wedding_id_wedding"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guest")),
    )
    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_guest_wedding_id"), ["wedding_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_guest_wedding_id"))

    op.drop_table("guest")
