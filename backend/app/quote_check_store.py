from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_quote_check_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS project_quote_checks (
                project_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                quote_check_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY(project_id)
                    REFERENCES projects(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_quote_checks_updated
            ON project_quote_checks(updated_at DESC);
            """
        )


def save_quote_check(
    project_id: str,
    quote_check: dict[str, Any],
) -> dict[str, Any]:
    timestamp = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO project_quote_checks (
                project_id,
                status,
                quote_check_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)

            ON CONFLICT(project_id)
            DO UPDATE SET
                status = excluded.status,
                quote_check_json = excluded.quote_check_json,
                updated_at = excluded.updated_at
            """,
            (
                project_id,
                quote_check["status"],
                json.dumps(
                    quote_check,
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                timestamp,
                timestamp,
            ),
        )

    saved = get_quote_check(project_id)

    if saved is None:
        raise RuntimeError("Quote check could not be saved.")

    return saved


def get_quote_check(project_id: str) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM project_quote_checks
            WHERE project_id = ?
            """,
            (project_id,),
        ).fetchone()

    if row is None:
        return None

    try:
        quote_check = json.loads(row["quote_check_json"])
    except json.JSONDecodeError:
        quote_check = {}

    return {
        "project_id": row["project_id"],
        "status": row["status"],
        "quote_check": quote_check,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }

def delete_quote_check(project_id: str) -> bool:
    with database_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM project_quote_checks
            WHERE project_id = ?
            """,
            (project_id,),
        )

    return cursor.rowcount > 0

