"""create household table

Revision ID: 8d4f2a6c1e07
Revises: 5b3e7d2a9c41
Create Date: 2026-10-04 19:30:00.000000

"""
import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d4f2a6c1e07'
down_revision: Union[str, Sequence[str], None] = '5b3e7d2a9c41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Every guest already on the list was invited alone as far as the data knows,
    so each one gets a household of one; the couple can regroup them afterwards.
    """
    op.create_table(
        "household",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("wedding_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("rsvp_token", sa.String(), nullable=False),
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
            name=op.f("fk_household_wedding_id_wedding"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_household")),
        sa.UniqueConstraint("rsvp_token", name=op.f("uq_household_rsvp_token")),
    )
    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_household_wedding_id"), ["wedding_id"], unique=False)

    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.add_column(sa.Column("household_id", sa.Integer(), nullable=True))

    connection = op.get_bind()
    guests = connection.execute(sa.text("SELECT id, wedding_id FROM guest")).all()
    for guest_id, wedding_id in guests:
        household_id = connection.execute(
            sa.text("INSERT INTO household (wedding_id, rsvp_token) VALUES (:wedding_id, :token)"),
            {"wedding_id": wedding_id, "token": secrets.token_urlsafe(24)},
        ).lastrowid
        connection.execute(
            sa.text("UPDATE guest SET household_id = :household_id WHERE id = :guest_id"),
            {"household_id": household_id, "guest_id": guest_id},
        )

    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.alter_column("household_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_index(batch_op.f("ix_guest_household_id"), ["household_id"], unique=False)
        batch_op.create_foreign_key(
            batch_op.f("fk_guest_household_id_household"),
            "household",
            ["household_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    """Downgrade schema. Guests stay; only their grouping is forgotten."""
    with op.batch_alter_table("guest", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("fk_guest_household_id_household"), type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_guest_household_id"))
        batch_op.drop_column("household_id")

    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_household_wedding_id"))

    op.drop_table("household")
