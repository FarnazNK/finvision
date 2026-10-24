"""Store holding quantity and cost basis as exact decimals.

Binary floats can't represent most decimal amounts exactly (0.1 + 0.2 != 0.3),
which makes totals drift. NUMERIC keeps the value the user entered.

Revision ID: 0002_exact_decimal_money
Revises: 0001_baseline
Create Date: 2026-10-24
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002_exact_decimal_money"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("holdings") as batch:
        batch.alter_column(
            "quantity",
            existing_type=sa.Float(),
            type_=sa.Numeric(20, 8),
            existing_nullable=False,
            postgresql_using="round(quantity::numeric, 8)",
        )
        batch.alter_column(
            "cost_basis",
            existing_type=sa.Float(),
            type_=sa.Numeric(20, 6),
            existing_nullable=False,
            postgresql_using="round(cost_basis::numeric, 6)",
        )


def downgrade() -> None:
    with op.batch_alter_table("holdings") as batch:
        batch.alter_column(
            "quantity",
            existing_type=sa.Numeric(20, 8),
            type_=sa.Float(),
            existing_nullable=False,
        )
        batch.alter_column(
            "cost_basis",
            existing_type=sa.Numeric(20, 6),
            type_=sa.Float(),
            existing_nullable=False,
        )
