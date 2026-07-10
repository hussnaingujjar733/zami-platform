from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_managed_project_updates_table() -> None:
    with database_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS managed_project_updates (
                id TEXT PRIMARY KEY,
                managed_project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'client',
                created_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_managed_project_updates_project
            ON managed_project_updates(managed_project_id)
            """
        )


def row_to_update(row) -> dict:
    return {
        "id": row["id"],
        "managed_project_id": row["managed_project_id"],
        "title": row["title"],
        "message": row["message"],
        "visibility": row["visibility"],
        "created_at": row["created_at"],
    }


def create_project_update(
    managed_project_id: str,
    title: str,
    message: str,
    visibility: str = "client",
) -> dict:
    update_id = f"upd_{uuid4().hex}"
    now = utc_now_iso()

    safe_visibility = visibility if visibility in {"client", "internal"} else "client"

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO managed_project_updates (
                id,
                managed_project_id,
                title,
                message,
                visibility,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                update_id,
                managed_project_id,
                title.strip(),
                message.strip(),
                safe_visibility,
                now,
            ),
        )

    return {
        "id": update_id,
        "managed_project_id": managed_project_id,
        "title": title.strip(),
        "message": message.strip(),
        "visibility": safe_visibility,
        "created_at": now,
    }


def list_project_updates(
    managed_project_id: str,
    client_visible_only: bool = False,
) -> list[dict]:
    if client_visible_only:
        query = """
            SELECT *
            FROM managed_project_updates
            WHERE managed_project_id = ?
              AND visibility = 'client'
            ORDER BY created_at DESC
        """
    else:
        query = """
            SELECT *
            FROM managed_project_updates
            WHERE managed_project_id = ?
            ORDER BY created_at DESC
        """

    with database_connection() as connection:
        rows = connection.execute(query, (managed_project_id,)).fetchall()

    return [row_to_update(row) for row in rows]
