from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_renovation_plan_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS project_renovation_plans (
                project_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY(project_id)
                    REFERENCES projects(id)
                    ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_renovation_plans_updated
            ON project_renovation_plans(updated_at DESC);
            """
        )


def save_renovation_plan(
    project_id: str,
    plan: dict[str, Any],
) -> dict[str, Any]:
    timestamp = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO project_renovation_plans (
                project_id,
                status,
                plan_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)

            ON CONFLICT(project_id)
            DO UPDATE SET
                status = excluded.status,
                plan_json = excluded.plan_json,
                updated_at = excluded.updated_at
            """,
            (
                project_id,
                plan["status"],
                json.dumps(
                    plan,
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                timestamp,
                timestamp,
            ),
        )

    saved = get_renovation_plan(project_id)

    if saved is None:
        raise RuntimeError(
            "Le plan de rénovation n'a pas pu être enregistré."
        )

    return saved


def get_renovation_plan(
    project_id: str,
) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM project_renovation_plans
            WHERE project_id = ?
            """,
            (project_id,),
        ).fetchone()

    if row is None:
        return None

    try:
        plan = json.loads(row["plan_json"])
    except json.JSONDecodeError:
        plan = {}

    return {
        "project_id": row["project_id"],
        "status": row["status"],
        "plan": plan,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
