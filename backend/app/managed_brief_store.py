from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_managed_project_briefs_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS managed_project_briefs (
                id TEXT PRIMARY KEY,
                managed_project_id TEXT NOT NULL UNIQUE,
                readiness_score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                summary TEXT NOT NULL,
                missing_documents_json TEXT NOT NULL,
                priority_actions_json TEXT NOT NULL,
                contractor_questions_json TEXT NOT NULL,
                homeowner_message TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_managed_briefs_project
            ON managed_project_briefs(managed_project_id);
            """
        )


def save_managed_project_brief(
    managed_project_id: str,
    brief: dict[str, Any],
) -> dict[str, Any]:
    now = utc_now_iso()
    brief_id = f"mb_{uuid4().hex}"

    with database_connection() as connection:
        connection.execute(
            "DELETE FROM managed_project_briefs WHERE managed_project_id = ?",
            (managed_project_id,),
        )

        connection.execute(
            """
            INSERT INTO managed_project_briefs (
                id,
                managed_project_id,
                readiness_score,
                risk_level,
                summary,
                missing_documents_json,
                priority_actions_json,
                contractor_questions_json,
                homeowner_message,
                metadata_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                brief_id,
                managed_project_id,
                int(brief["readiness_score"]),
                brief["risk_level"],
                brief["summary"],
                json.dumps(brief["missing_documents"], ensure_ascii=False),
                json.dumps(brief["priority_actions"], ensure_ascii=False),
                json.dumps(brief["contractor_questions"], ensure_ascii=False),
                brief["homeowner_message"],
                json.dumps(brief.get("metadata", {}), ensure_ascii=False),
                now,
                now,
            ),
        )

    saved = get_managed_project_brief(managed_project_id)

    if saved is None:
        raise RuntimeError("Brief could not be saved.")

    return saved


def get_managed_project_brief(
    managed_project_id: str,
) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM managed_project_briefs
            WHERE managed_project_id = ?
            """,
            (managed_project_id,),
        ).fetchone()

    if row is None:
        return None

    return {
        "id": row["id"],
        "managed_project_id": row["managed_project_id"],
        "readiness_score": row["readiness_score"],
        "risk_level": row["risk_level"],
        "summary": row["summary"],
        "missing_documents": json.loads(row["missing_documents_json"]),
        "priority_actions": json.loads(row["priority_actions_json"]),
        "contractor_questions": json.loads(row["contractor_questions_json"]),
        "homeowner_message": row["homeowner_message"],
        "metadata": json.loads(row["metadata_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
