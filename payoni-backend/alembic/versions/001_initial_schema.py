"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # merchants
    op.create_table(
        "merchants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("tax_id", sa.String(20)),
        sa.Column("phone", sa.String(20)),
        sa.Column("webhook_url", sa.String(512)),
        sa.Column("webhook_secret", sa.String(128)),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean, default=False, nullable=False, server_default="false"),
        sa.Column("plan", sa.String(50), default="free", nullable=False, server_default="free"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_merchants_email", "merchants", ["email"], unique=True)

    # api_keys
    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_hash", sa.String(255), nullable=False),
        sa.Column("key_prefix", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100)),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_api_keys_merchant_id", "api_keys", ["merchant_id"])
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)

    # pos_accounts
    op.create_table(
        "pos_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider_slug", sa.String(50), nullable=False),
        sa.Column("display_name", sa.String(100)),
        sa.Column("credentials_enc", sa.Text, nullable=False),
        sa.Column("iv", sa.String(64), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("environment", sa.String(10), nullable=False, server_default="production"),
        sa.Column("last_tested_at", sa.DateTime(timezone=True)),
        sa.Column("last_test_success", sa.Boolean),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_pos_accounts_merchant_id", "pos_accounts", ["merchant_id"])
    op.create_index("ix_pos_accounts_merchant_provider", "pos_accounts", ["merchant_id", "provider_slug"])

    # widgets (payment_links'ten önce FK bağımlılığı yok)
    op.create_table(
        "widgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("preferred_pos_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pos_accounts.id")),
        sa.Column("allowed_origins", postgresql.ARRAY(sa.String)),
        sa.Column("theme", postgresql.JSONB),
        sa.Column("amount", sa.Numeric(14, 2)),
        sa.Column("allow_installments", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_widgets_merchant_id", "widgets", ["merchant_id"])

    # payment_links
    op.create_table(
        "payment_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("short_code", sa.String(12), nullable=False),
        sa.Column("title", sa.String(255)),
        sa.Column("description", sa.Text),
        sa.Column("amount", sa.Numeric(14, 2)),
        sa.Column("currency", sa.String(3), nullable=False, server_default="TRY"),
        sa.Column("min_amount", sa.Numeric(14, 2)),
        sa.Column("max_amount", sa.Numeric(14, 2)),
        sa.Column("preferred_pos_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pos_accounts.id")),
        sa.Column("allow_installments", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("max_uses", sa.Integer),
        sa.Column("use_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("redirect_url", sa.String(512)),
        sa.Column("custom_fields", postgresql.JSONB, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payment_links_short_code", "payment_links", ["short_code"], unique=True)
    op.create_index("ix_payment_links_merchant_id", "payment_links", ["merchant_id"])

    # transactions
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("pos_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pos_accounts.id"), nullable=False),
        sa.Column("payment_link_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("payment_links.id")),
        sa.Column("widget_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("widgets.id")),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="TRY"),
        sa.Column("installments", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("card_last4", sa.String(4)),
        sa.Column("card_holder", sa.String(100)),
        sa.Column("card_brand", sa.String(30)),
        sa.Column("bin_number", sa.String(6)),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("gateway_tx_id", sa.String(255)),
        sa.Column("gateway_ref", sa.String(255)),
        sa.Column("gateway_response", postgresql.JSONB),
        sa.Column("is_3d", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("three_d_status", sa.String(20)),
        sa.Column("three_d_md", sa.Text),
        sa.Column("customer_email", sa.String(255)),
        sa.Column("customer_name", sa.String(100)),
        sa.Column("customer_ip", sa.String(45)),
        sa.Column("description", sa.Text),
        sa.Column("metadata", postgresql.JSONB, server_default="{}"),
        sa.Column("error_code", sa.String(50)),
        sa.Column("error_message", sa.Text),
        sa.Column("refunded_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transactions_merchant_created", "transactions", ["merchant_id", "created_at"])
    op.create_index("ix_transactions_status", "transactions", ["status"])
    op.create_index("ix_transactions_three_d_md", "transactions", ["three_d_md"])
    op.create_index("ix_transactions_gateway_tx_id", "transactions", ["gateway_tx_id"])

    # payment_attempts
    op.create_table(
        "payment_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pos_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pos_accounts.id"), nullable=False),
        sa.Column("attempt_number", sa.SmallInteger, nullable=False, server_default="1"),
        sa.Column("status", sa.String(30)),
        sa.Column("gateway_response", postgresql.JSONB),
        sa.Column("error_code", sa.String(50)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payment_attempts_transaction_id", "payment_attempts", ["transaction_id"])

    # webhook_logs
    op.create_table(
        "webhook_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id"), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id")),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("provider_slug", sa.String(50)),
        sa.Column("http_method", sa.String(10)),
        sa.Column("url", sa.String(512)),
        sa.Column("headers", postgresql.JSONB),
        sa.Column("payload", postgresql.JSONB),
        sa.Column("raw_body", sa.Text),
        sa.Column("http_status", sa.SmallInteger),
        sa.Column("response_body", sa.Text),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("retry_count", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_webhook_logs_merchant_id", "webhook_logs", ["merchant_id"])
    op.create_index("ix_webhook_logs_transaction_id", "webhook_logs", ["transaction_id"])


def downgrade() -> None:
    op.drop_table("webhook_logs")
    op.drop_table("payment_attempts")
    op.drop_table("transactions")
    op.drop_table("payment_links")
    op.drop_table("widgets")
    op.drop_table("pos_accounts")
    op.drop_table("api_keys")
    op.drop_table("merchants")
