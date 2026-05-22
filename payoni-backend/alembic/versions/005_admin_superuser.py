"""005 admin superuser

Revision ID: 005
Revises: 004
Create Date: 2026-05-22
"""
from alembic import op

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'merchants' AND column_name = 'is_superuser'
            ) THEN
                ALTER TABLE merchants ADD COLUMN is_superuser BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
        END $$;
    """)


def downgrade():
    op.execute("ALTER TABLE merchants DROP COLUMN IF EXISTS is_superuser;")
