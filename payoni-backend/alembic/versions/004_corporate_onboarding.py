"""Kurumsal onboarding — merchant alanları + merchant_documents tablosu

Revision ID: 004
Revises: 003
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name=:t AND column_name=:c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def table_exists(conn, table: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name=:t"
        ),
        {"t": table},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()

    # ─── merchants yeni alanlar ───────────────────────────────────────────────
    new_cols = [
        ("company_type",       sa.String(50)),
        ("tax_office",         sa.String(255)),
        ("trade_registry_no",  sa.String(100)),
        ("company_address",    sa.String(1000)),
        ("authorized_name",    sa.String(255)),
        ("authorized_title",   sa.String(100)),
        ("authorized_tc",      sa.String(11)),
        ("authorized_phone",   sa.String(20)),
        ("onboarding_status",  sa.String(30)),
    ]
    for col_name, col_type in new_cols:
        if not column_exists(conn, "merchants", col_name):
            nullable = col_name != "onboarding_status"
            op.add_column(
                "merchants",
                sa.Column(col_name, col_type, nullable=nullable,
                          server_default="pending_documents" if col_name == "onboarding_status" else None),
            )

    # ─── merchant_documents tablosu ─────────────────────────────────────────
    if not table_exists(conn, "merchant_documents"):
        op.create_table(
            "merchant_documents",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "merchant_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("merchants.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("document_type", sa.String(50), nullable=False),
            sa.Column("file_path", sa.String(512), nullable=False),
            sa.Column("original_filename", sa.String(255), nullable=False),
            sa.Column("mime_type", sa.String(100), nullable=False),
            sa.Column("file_size", sa.Integer, nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column(
                "uploaded_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("NOW()"),
            ),
            sa.Column("rejection_reason", sa.String(500)),
        )


def downgrade() -> None:
    op.drop_table("merchant_documents")
    for col in [
        "company_type", "tax_office", "trade_registry_no", "company_address",
        "authorized_name", "authorized_title", "authorized_tc", "authorized_phone",
        "onboarding_status",
    ]:
        op.drop_column("merchants", col)
