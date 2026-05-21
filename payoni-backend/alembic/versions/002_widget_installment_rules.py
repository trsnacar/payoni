"""widget installment_rules column

Revision ID: 002
Revises: 001
Create Date: 2026-05-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(
        sa.text("SELECT 1 FROM information_schema.columns WHERE table_name='widgets' AND column_name='installment_rules'")
    )
    if not result.fetchone():
        op.add_column(
            'widgets',
            sa.Column('installment_rules', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]')
        )


def downgrade() -> None:
    op.drop_column('widgets', 'installment_rules')
