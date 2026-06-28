"""add document chunk content hash uniqueness

Revision ID: 20260628_002
Revises: 20260627_001
Create Date: 2026-06-28
"""
from alembic import op


revision = "20260628_002"
down_revision = "20260627_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_document_chunks_document_content_hash",
        "document_chunks",
        ["document_id", "content_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_document_chunks_document_content_hash", table_name="document_chunks")
