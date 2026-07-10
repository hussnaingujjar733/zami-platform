from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_analysis_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS project_analyses (
                project_id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                model_version TEXT NOT NULL,
                status TEXT NOT NULL,
                analysis_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY(project_id)
                    REFERENCES projects(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_project_analyses_updated
            ON project_analyses(updated_at DESC);
            """
        )


def save_analysis(
    project_id: str,
    analysis: dict[str, Any],
) -> dict[str, Any]:
    timestamp = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO project_analyses (
                project_id,
                model_name,
                model_version,
                status,
                analysis_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)

            ON CONFLICT(project_id)
            DO UPDATE SET
                model_name = excluded.model_name,
                model_version = excluded.model_version,
                status = excluded.status,
                analysis_json = excluded.analysis_json,
                updated_at = excluded.updated_at
            """,
            (
                project_id,
                analysis["model"]["name"],
                analysis["model"]["version"],
                analysis["status"],
                json.dumps(
                    analysis,
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                timestamp,
                timestamp,
            ),
        )

    saved = get_analysis(project_id)

    if saved is None:
        raise RuntimeError(
            "L'analyse n'a pas pu être enregistrée."
        )

    return saved


def get_analysis(
    project_id: str,
) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM project_analyses
            WHERE project_id = ?
            """,
            (project_id,),
        ).fetchone()

    if row is None:
        return None

    try:
        analysis = json.loads(row["analysis_json"])
    except json.JSONDecodeError:
        analysis = {}

    return {
        "project_id": row["project_id"],
        "model_name": row["model_name"],
        "model_version": row["model_version"],
        "status": row["status"],
        "analysis": analysis,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
