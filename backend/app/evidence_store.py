from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.database import database_connection


BACKEND_ROOT = Path(__file__).resolve().parents[1]
UPLOAD_ROOT = BACKEND_ROOT / "data" / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def init_evidence_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS project_evidence (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                evidence_type TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                content_type TEXT NOT NULL,
                file_kind TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                sha256 TEXT NOT NULL,
                source_type TEXT NOT NULL,
                verification_status TEXT NOT NULL DEFAULT 'uploaded',
                analysis_status TEXT NOT NULL DEFAULT 'pending',
                verified INTEGER NOT NULL DEFAULT 0,
                uploaded_at TEXT NOT NULL,
                metadata_json TEXT NOT NULL DEFAULT '{}',

                FOREIGN KEY(project_id)
                    REFERENCES projects(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_evidence_project
            ON project_evidence(project_id);

            CREATE INDEX IF NOT EXISTS idx_evidence_uploaded
            ON project_evidence(uploaded_at DESC);
            """
        )


def row_to_evidence(row: Any) -> dict[str, Any]:
    try:
        metadata = json.loads(row["metadata_json"] or "{}")
    except json.JSONDecodeError:
        metadata = {}

    return {
        "id": row["id"],
        "project_id": row["project_id"],
        "evidence_type": row["evidence_type"],
        "original_filename": row["original_filename"],
        "stored_filename": row["stored_filename"],
        "content_type": row["content_type"],
        "file_kind": row["file_kind"],
        "size_bytes": row["size_bytes"],
        "sha256": row["sha256"],
        "source_type": row["source_type"],
        "verification_status": row["verification_status"],
        "analysis_status": row["analysis_status"],
        "verified": bool(row["verified"]),
        "uploaded_at": row["uploaded_at"],
        "metadata": metadata,
    }


def insert_evidence(record: dict[str, Any]) -> dict[str, Any]:
    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO project_evidence (
                id,
                project_id,
                evidence_type,
                original_filename,
                stored_filename,
                content_type,
                file_kind,
                size_bytes,
                sha256,
                source_type,
                verification_status,
                analysis_status,
                verified,
                uploaded_at,
                metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["project_id"],
                record["evidence_type"],
                record["original_filename"],
                record["stored_filename"],
                record["content_type"],
                record["file_kind"],
                record["size_bytes"],
                record["sha256"],
                record["source_type"],
                record["verification_status"],
                record["analysis_status"],
                1 if record["verified"] else 0,
                record["uploaded_at"],
                json.dumps(
                    record.get("metadata", {}),
                    ensure_ascii=False,
                ),
            ),
        )

    saved = get_evidence(
        record["project_id"],
        record["id"],
    )

    if saved is None:
        raise RuntimeError("Evidence creation failed.")

    return saved


def list_evidence(project_id: str) -> list[dict[str, Any]]:
    with database_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM project_evidence
            WHERE project_id = ?
            ORDER BY uploaded_at DESC
            """,
            (project_id,),
        ).fetchall()

    return [row_to_evidence(row) for row in rows]


def get_evidence(
    project_id: str,
    evidence_id: str,
) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM project_evidence
            WHERE project_id = ?
              AND id = ?
            """,
            (project_id, evidence_id),
        ).fetchone()

    return row_to_evidence(row) if row else None


def delete_evidence(
    project_id: str,
    evidence_id: str,
) -> dict[str, Any] | None:
    existing = get_evidence(project_id, evidence_id)

    if existing is None:
        return None

    with database_connection() as connection:
        connection.execute(
            """
            DELETE FROM project_evidence
            WHERE project_id = ?
              AND id = ?
            """,
            (project_id, evidence_id),
        )

    return existing
