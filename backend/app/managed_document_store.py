from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_managed_documents_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS managed_project_documents (
                id TEXT PRIMARY KEY,
                managed_project_id TEXT NOT NULL,
                document_type TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                file_kind TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_managed_docs_project
            ON managed_project_documents(managed_project_id, created_at DESC);
            """
        )


def insert_managed_document(
    managed_project_id: str,
    document_type: str,
    original_filename: str,
    stored_filename: str,
    file_kind: str,
    size_bytes: int,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    document_id = f"md_{uuid4().hex}"
    now = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO managed_project_documents (
                id,
                managed_project_id,
                document_type,
                original_filename,
                stored_filename,
                file_kind,
                size_bytes,
                metadata_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                document_id,
                managed_project_id,
                document_type,
                original_filename,
                stored_filename,
                file_kind,
                size_bytes,
                json.dumps(metadata or {}, ensure_ascii=False),
                now,
            ),
        )

    document = get_managed_document(document_id)

    if document is None:
        raise RuntimeError("Managed document could not be saved.")

    return document


def row_to_document(row: Any) -> dict[str, Any]:
    try:
        metadata = json.loads(row["metadata_json"])
    except Exception:
        metadata = {}

    return {
        "id": row["id"],
        "managed_project_id": row["managed_project_id"],
        "document_type": row["document_type"],
        "original_filename": row["original_filename"],
        "stored_filename": row["stored_filename"],
        "file_kind": row["file_kind"],
        "size_bytes": row["size_bytes"],
        "metadata": metadata,
        "created_at": row["created_at"],
    }


def list_managed_documents(managed_project_id: str) -> list[dict[str, Any]]:
    with database_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM managed_project_documents
            WHERE managed_project_id = ?
            ORDER BY created_at DESC
            """,
            (managed_project_id,),
        ).fetchall()

    return [row_to_document(row) for row in rows]


def get_managed_document(document_id: str) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM managed_project_documents
            WHERE id = ?
            """,
            (document_id,),
        ).fetchone()

    if row is None:
        return None

    return row_to_document(row)
