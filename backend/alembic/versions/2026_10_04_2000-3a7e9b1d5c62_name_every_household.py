"""name every household

Revision ID: 3a7e9b1d5c62
Revises: 8d4f2a6c1e07
Create Date: 2026-10-04 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a7e9b1d5c62'
down_revision: Union[str, Sequence[str], None] = '8d4f2a6c1e07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def name_after_members(members: list[tuple[str, str]]) -> str | None:
    """The guest's full name for a household of one, otherwise its surnames, each once."""
    if len(members) == 1:
        first_name, last_name = members[0]
        return f"{first_name} {last_name}"
    surnames = list(dict.fromkeys(last_name for _, last_name in members))
    return " & ".join(surnames) or None


def rebuild_household_table(nullable: bool) -> None:
    """A batch rebuild: safe for the guests pointing here only because env.py runs
    migrations with foreign-key enforcement off."""
    with op.batch_alter_table("household", schema=None) as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(), nullable=nullable)


def upgrade() -> None:
    """Upgrade schema.

    The guest list now shows every guest's household by name, so a household
    can no longer be unnamed. Existing ones are named after who is in them.
    """
    connection = op.get_bind()
    unnamed = connection.execute(sa.text("SELECT id FROM household WHERE name IS NULL")).scalars().all()
    for household_id in unnamed:
        members = connection.execute(
            sa.text("SELECT first_name, last_name FROM guest WHERE household_id = :id ORDER BY id"),
            {"id": household_id},
        ).all()
        connection.execute(
            sa.text("UPDATE household SET name = :name WHERE id = :id"),
            {"name": name_after_members(members) or f"Household {household_id}", "id": household_id},
        )

    rebuild_household_table(nullable=False)


def downgrade() -> None:
    """Downgrade schema. Names are kept; they just become optional again."""
    rebuild_household_table(nullable=True)
