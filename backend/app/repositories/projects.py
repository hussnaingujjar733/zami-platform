from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def encode_json(value: dict[str, Any]) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
    )


def decode_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}

    try:
        decoded = json.loads(value)
    except json.JSONDecodeError:
        return {}

    return decoded if isinstance(decoded, dict) else {}


def row_to_project(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "status": row["status"],
        "address_label": row["address_label"],
        "address": decode_json(row["address_json"]),
        "snapshot": decode_json(row["snapshot_json"]),
        "answers": decode_json(row["answers_json"]),
        "report": decode_json(row["report_json"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def create_project(
    *,
    address_label: str | None,
    address: dict[str, Any],
    snapshot: dict[str, Any],
) -> dict[str, Any]:
    project_id = f"prj_{uuid4().hex}"
    timestamp = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO projects (
                id,
                status,
                address_label,
                address_json,
                snapshot_json,
                answers_json,
                report_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                "draft",
                address_label,
                encode_json(address),
                encode_json(snapshot),
                "{}",
                "{}",
                timestamp,
                timestamp,
            ),
        )

    project = get_project(project_id)

    if project is None:
        raise RuntimeError("Project creation failed.")

    return project


def get_project(project_id: str) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM projects
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()

    return row_to_project(row) if row else None


def list_projects(limit: int = 50) -> list[dict[str, Any]]:
    with database_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM projects
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [row_to_project(row) for row in rows]


def update_json_field(
    project_id: str,
    field_name: str,
    incoming_value: dict[str, Any],
    *,
    merge: bool,
) -> dict[str, Any] | None:
    allowed_fields = {
        "snapshot_json": "snapshot",
        "answers_json": "answers",
        "report_json": "report",
    }

    logical_field = allowed_fields.get(field_name)

    if logical_field is None:
        raise ValueError("Unsupported JSON field.")

    project = get_project(project_id)

    if project is None:
        return None

    current_value = project[logical_field]

    if merge:
        new_value = {
            **current_value,
            **incoming_value,
        }
    else:
        new_value = incoming_value

    timestamp = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            f"""
            UPDATE projects
            SET {field_name} = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                encode_json(new_value),
                timestamp,
                project_id,
            ),
        )

    return get_project(project_id)


def update_project_status(
    project_id: str,
    status: str,
) -> dict[str, Any] | None:
    timestamp = utc_now_iso()

    with database_connection() as connection:
        result = connection.execute(
            """
            UPDATE projects
            SET status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                timestamp,
                project_id,
            ),
        )

    if result.rowcount == 0:
        return None

    return get_project(project_id)


def delete_project(project_id: str) -> bool:
    with database_connection() as connection:
        result = connection.execute(
            """
            DELETE FROM projects
            WHERE id = ?
            """,
            (project_id,),
        )

    return result.rowcount > 0
