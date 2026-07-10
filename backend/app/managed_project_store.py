from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def current_year() -> int:
    return datetime.now(timezone.utc).year


def generate_client_token() -> str:
    return secrets.token_urlsafe(32)


def hash_client_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_public_reference() -> str:
    year = current_year()

    with database_connection() as connection:
        for _ in range(30):
            number = secrets.randbelow(900000) + 100000
            reference = f"ZAMI-REQ-{year}-{number}"

            exists = connection.execute(
                """
                SELECT 1
                FROM managed_projects
                WHERE public_reference = ?
                """,
                (reference,),
            ).fetchone()

            if exists is None:
                return reference

    return f"ZAMI-REQ-{year}-{uuid4().hex[:8].upper()}"


def init_managed_projects_table() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS managed_projects (
                id TEXT PRIMARY KEY,
                public_reference TEXT UNIQUE,
                status TEXT NOT NULL,
                project_type TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT,
                property_type TEXT,
                surface_m2 REAL,
                dpe_class TEXT,
                urgency TEXT,
                has_quote INTEGER NOT NULL DEFAULT 0,
                has_artisan INTEGER NOT NULL DEFAULT 0,
                budget_range TEXT,
                description TEXT,
                contact_name TEXT NOT NULL,
                contact_email TEXT NOT NULL,
                contact_phone TEXT,
                preferred_contact TEXT,
                consent INTEGER NOT NULL DEFAULT 0,
                source TEXT NOT NULL DEFAULT 'confier_projet',
                n8n_status TEXT NOT NULL DEFAULT 'pending',
                admin_notification_status TEXT NOT NULL DEFAULT 'pending',
                internal_note TEXT,
                next_action TEXT,
                client_access_token_hash TEXT,
                client_portal_enabled INTEGER NOT NULL DEFAULT 1,
                client_last_seen_at TEXT,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_managed_projects_created
            ON managed_projects(created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_managed_projects_status
            ON managed_projects(status);

            """
        )

    ensure_managed_project_columns()
    backfill_public_references()
    ensure_public_reference_index()



def ensure_public_reference_index() -> None:
    with database_connection() as connection:
        existing_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(managed_projects)"
            ).fetchall()
        }

        if "public_reference" not in existing_columns:
            return

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_managed_projects_public_reference
            ON managed_projects(public_reference)
            """
        )


def ensure_managed_project_columns() -> None:
    required_columns = {
        "public_reference": "TEXT",
        "internal_note": "TEXT",
        "next_action": "TEXT",
        "client_access_token_hash": "TEXT",
        "client_portal_enabled": "INTEGER NOT NULL DEFAULT 1",
        "client_last_seen_at": "TEXT",
        "client_public_note": "TEXT",
        "client_requested_action": "TEXT",
        "contractor_name": "TEXT",
        "contractor_company": "TEXT",
        "current_phase": "TEXT",
        "work_progress_percent": "INTEGER NOT NULL DEFAULT 0",
        "zami_offer_status": "TEXT",
        "zami_offer_title": "TEXT",
        "zami_offer_summary": "TEXT",
        "zami_offer_amount_eur": "REAL",
        "zami_offer_start_date": "TEXT",
        "zami_offer_duration": "TEXT",
        "zami_offer_decision_at": "TEXT",
    }

    with database_connection() as connection:
        existing_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(managed_projects)"
            ).fetchall()
        }

        for column_name, column_type in required_columns.items():
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE managed_projects ADD COLUMN {column_name} {column_type}"
                )


def backfill_public_references() -> None:
    with database_connection() as connection:
        rows = connection.execute(
            """
            SELECT id
            FROM managed_projects
            WHERE public_reference IS NULL
               OR TRIM(public_reference) = ''
            """
        ).fetchall()

    for row in rows:
        reference = generate_public_reference()

        with database_connection() as connection:
            connection.execute(
                """
                UPDATE managed_projects
                SET public_reference = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (reference, utc_now_iso(), row["id"]),
            )


def create_managed_project(payload: dict[str, Any]) -> dict[str, Any]:
    project_id = f"mp_{uuid4().hex}"
    now = utc_now_iso()
    client_token = generate_client_token()
    public_reference = generate_public_reference()

    project = {
        "id": project_id,
        "public_reference": public_reference,
        "status": "received",
        "project_type": str(payload.get("project_type") or "").strip(),
        "address": str(payload.get("address") or "").strip(),
        "city": str(payload.get("city") or "").strip(),
        "property_type": str(payload.get("property_type") or "").strip(),
        "surface_m2": payload.get("surface_m2"),
        "dpe_class": str(payload.get("dpe_class") or "").strip(),
        "urgency": str(payload.get("urgency") or "").strip(),
        "has_quote": bool(payload.get("has_quote")),
        "has_artisan": bool(payload.get("has_artisan")),
        "budget_range": str(payload.get("budget_range") or "").strip(),
        "description": str(payload.get("description") or "").strip(),
        "contact_name": str(payload.get("contact_name") or "").strip(),
        "contact_email": str(payload.get("contact_email") or "").strip(),
        "contact_phone": str(payload.get("contact_phone") or "").strip(),
        "preferred_contact": str(payload.get("preferred_contact") or "").strip(),
        "consent": bool(payload.get("consent")),
        "source": "confier_projet",
        "n8n_status": "pending",
        "admin_notification_status": "pending",
        "internal_note": str(payload.get("internal_note") or "").strip(),
        "next_action": str(payload.get("next_action") or "").strip(),
        "client_access_token_hash": hash_client_token(client_token),
        "client_portal_enabled": True,
        "client_last_seen_at": "",
        "payload": payload,
        "created_at": now,
        "updated_at": now,
    }

    validate_managed_project(project)

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO managed_projects (
                id,
                public_reference,
                status,
                project_type,
                address,
                city,
                property_type,
                surface_m2,
                dpe_class,
                urgency,
                has_quote,
                has_artisan,
                budget_range,
                description,
                contact_name,
                contact_email,
                contact_phone,
                preferred_contact,
                consent,
                source,
                n8n_status,
                admin_notification_status,
                internal_note,
                next_action,
                client_access_token_hash,
                client_portal_enabled,
                client_last_seen_at,
                payload_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project["id"],
                project["public_reference"],
                project["status"],
                project["project_type"],
                project["address"],
                project["city"],
                project["property_type"],
                project["surface_m2"],
                project["dpe_class"],
                project["urgency"],
                int(project["has_quote"]),
                int(project["has_artisan"]),
                project["budget_range"],
                project["description"],
                project["contact_name"],
                project["contact_email"],
                project["contact_phone"],
                project["preferred_contact"],
                int(project["consent"]),
                project["source"],
                project["n8n_status"],
                project["admin_notification_status"],
                project["internal_note"],
                project["next_action"],
                project["client_access_token_hash"],
                int(project["client_portal_enabled"]),
                project["client_last_seen_at"],
                json.dumps(project["payload"], ensure_ascii=False),
                project["created_at"],
                project["updated_at"],
            ),
        )

    saved = get_managed_project(project_id)

    if saved is None:
        raise RuntimeError("Managed project could not be saved.")

    saved["client_access_token"] = client_token
    saved["client_portal_path"] = (
        f"/espace-client/{project_id}?token={client_token}"
    )

    return saved


def validate_managed_project(project: dict[str, Any]) -> None:
    missing = []

    for key in [
        "project_type",
        "address",
        "contact_name",
        "contact_email",
    ]:
        if not project.get(key):
            missing.append(key)

    if not project.get("consent"):
        missing.append("consent")

    if missing:
        raise ValueError(
            "Champs obligatoires manquants: " + ", ".join(missing)
        )


def row_to_project(row: Any) -> dict[str, Any]:
    try:
        payload = json.loads(row["payload_json"])
    except Exception:
        payload = {}

    keys = row.keys()

    return {
        "id": row["id"],
        "public_reference": (
            row["public_reference"] if "public_reference" in keys else ""
        ),
        "status": row["status"],
        "project_type": row["project_type"],
        "address": row["address"],
        "city": row["city"],
        "property_type": row["property_type"],
        "surface_m2": row["surface_m2"],
        "dpe_class": row["dpe_class"],
        "urgency": row["urgency"],
        "has_quote": bool(row["has_quote"]),
        "has_artisan": bool(row["has_artisan"]),
        "budget_range": row["budget_range"],
        "description": row["description"],
        "contact_name": row["contact_name"],
        "contact_email": row["contact_email"],
        "contact_phone": row["contact_phone"],
        "preferred_contact": row["preferred_contact"],
        "consent": bool(row["consent"]),
        "source": row["source"],
        "n8n_status": row["n8n_status"],
        "admin_notification_status": row["admin_notification_status"],
        "internal_note": row["internal_note"] if "internal_note" in keys else "",
        "next_action": row["next_action"] if "next_action" in keys else "",
        "client_access_token_hash": (
            row["client_access_token_hash"]
            if "client_access_token_hash" in keys
            else ""
        ),
        "client_portal_enabled": (
            bool(row["client_portal_enabled"])
            if "client_portal_enabled" in keys
            else True
        ),
        "client_last_seen_at": (
            row["client_last_seen_at"]
            if "client_last_seen_at" in keys
            else ""
        ),
        "payload": payload,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def get_managed_project(project_id: str) -> dict[str, Any] | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM managed_projects
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()

    if row is None:
        return None

    return row_to_project(row)


def get_managed_project_by_reference_email(
    public_reference: str,
    contact_email: str,
) -> dict[str, Any] | None:
    reference = public_reference.strip().upper()
    email = contact_email.strip().lower()

    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM managed_projects
            WHERE UPPER(public_reference) = ?
              AND LOWER(contact_email) = ?
            """,
            (reference, email),
        ).fetchone()

    if row is None:
        return None

    return row_to_project(row)


def list_managed_projects(limit: int = 50) -> list[dict[str, Any]]:
    safe_limit = max(1, min(limit, 200))

    with database_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM managed_projects
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()

    return [row_to_project(row) for row in rows]


def update_managed_project_notification_status(
    project_id: str,
    status: str,
) -> None:
    with database_connection() as connection:
        connection.execute(
            """
            UPDATE managed_projects
            SET admin_notification_status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (status, utc_now_iso(), project_id),
        )


def update_managed_project_team_fields(
    project_id: str,
    status_value: str,
    internal_note: str = "",
    next_action: str = "",
) -> dict[str, Any] | None:
    allowed_statuses = {
        "received",
        "documents_needed",
        "ready_for_review",
        "contractor_matching",
        "quote_collection",
        "client_decision",
        "closed",
    }

    if status_value not in allowed_statuses:
        raise ValueError("Statut invalide.")

    with database_connection() as connection:
        connection.execute(
            """
            UPDATE managed_projects
            SET status = ?,
                internal_note = ?,
                next_action = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                status_value,
                internal_note.strip(),
                next_action.strip(),
                utc_now_iso(),
                project_id,
            ),
        )

    return get_managed_project(project_id)


def verify_client_access(project_id: str, token: str) -> dict[str, Any] | None:
    project = get_managed_project(project_id)

    if project is None:
        return None

    if not project.get("client_portal_enabled"):
        return None

    stored_hash = str(project.get("client_access_token_hash") or "").strip()

    if not stored_hash:
        return None

    if hash_client_token(token) != stored_hash:
        return None

    return project


def rotate_client_access_token(project_id: str) -> dict[str, str]:
    token = generate_client_token()
    token_hash = hash_client_token(token)

    with database_connection() as connection:
        connection.execute(
            """
            UPDATE managed_projects
            SET client_access_token_hash = ?,
                client_portal_enabled = 1,
                updated_at = ?
            WHERE id = ?
            """,
            (token_hash, utc_now_iso(), project_id),
        )

    return {
        "client_access_token": token,
        "client_portal_path": f"/espace-client/{project_id}?token={token}",
    }


def touch_client_last_seen(project_id: str) -> None:
    now = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            UPDATE managed_projects
            SET client_last_seen_at = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (now, now, project_id),
        )


def public_project_view(project: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": project["id"],
        "public_reference": project.get("public_reference"),
        "status": project["status"],
        "project_type": project["project_type"],
        "address": project["address"],
        "city": project.get("city"),
        "property_type": project.get("property_type"),
        "surface_m2": project.get("surface_m2"),
        "dpe_class": project.get("dpe_class"),
        "urgency": project.get("urgency"),
        "has_quote": project.get("has_quote"),
        "has_artisan": project.get("has_artisan"),
        "budget_range": project.get("budget_range"),
        "description": project.get("description"),
        "contact_name": project.get("contact_name"),
        "contact_email": project.get("contact_email"),
        "preferred_contact": project.get("preferred_contact"),
        "next_action": project.get("next_action"),
        "client_public_note": project.get("client_public_note"),
        "client_requested_action": project.get("client_requested_action"),
        "contractor_name": project.get("contractor_name"),
        "contractor_company": project.get("contractor_company"),
        "current_phase": project.get("current_phase"),
        "work_progress_percent": project.get("work_progress_percent", 0),
        "zami_offer_status": project.get("zami_offer_status"),
        "zami_offer_title": project.get("zami_offer_title"),
        "zami_offer_summary": project.get("zami_offer_summary"),
        "zami_offer_amount_eur": project.get("zami_offer_amount_eur"),
        "zami_offer_start_date": project.get("zami_offer_start_date"),
        "zami_offer_duration": project.get("zami_offer_duration"),
        "zami_offer_decision_at": project.get("zami_offer_decision_at"),
        "created_at": project.get("created_at"),
        "updated_at": project.get("updated_at"),
    }
