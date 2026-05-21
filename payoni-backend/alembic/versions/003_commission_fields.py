"""commission_rates ve commission_passthrough alanları

Revision ID: 003
Revises: 002
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # pos_accounts.commission_rates
    result = conn.execute(
        sa.text("SELECT 1 FROM information_schema.columns WHERE table_name='pos_accounts' AND column_name='commission_rates'")
    )
    if not result.fetchone():
        op.add_column(
            'pos_accounts',
            sa.Column('commission_rates', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}')
        )

    # payment_links.commission_passthrough
    result = conn.execute(
        sa.text("SELECT 1 FROM information_schema.columns WHERE table_name='payment_links' AND column_name='commission_passthrough'")
    )
    if not result.fetchone():
        op.add_column(
            'payment_links',
            sa.Column('commission_passthrough', sa.Boolean(), nullable=False, server_default='false')
        )

    # widgets.commission_passthrough
    result = conn.execute(
        sa.text("SELECT 1 FROM information_schema.columns WHERE table_name='widgets' AND column_name='commission_passthrough'")
    )
    if not result.fetchone():
        op.add_column(
            'widgets',
            sa.Column('commission_passthrough', sa.Boolean(), nullable=False, server_default='false')
        )


def downgrade() -> None:
    op.drop_column('pos_accounts', 'commission_rates')
    op.drop_column('payment_links', 'commission_passthrough')
    op.drop_column('widgets', 'commission_passthrough')
