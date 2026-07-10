from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from uuid import uuid4

from app.database import database_connection


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_client_accounts_table() -> None:
    with database_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS client_accounts (
                id TEXT PRIMARY KEY,
                managed_project_id TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                full_name TEXT,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login_at TEXT
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_client_accounts_project
            ON client_accounts(managed_project_id)
            """
        )


def hash_password(password: str) -> str:
    iterations = 120_000
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()

    return f"pbkdf2_sha256${iterations}${salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt, expected_digest = stored_hash.split("$")
        iterations = int(iterations_text)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()

    return hmac.compare_digest(digest, expected_digest)


def row_to_account(row) -> dict:
    return {
        "id": row["id"],
        "managed_project_id": row["managed_project_id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "created_at": row["created_at"],
        "last_login_at": row["last_login_at"],
    }


def get_client_account_by_email(email: str) -> dict | None:
    normalized_email = email.strip().lower()

    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM client_accounts
            WHERE LOWER(email) = ?
            """,
            (normalized_email,),
        ).fetchone()

    return row_to_account(row) if row else None


def create_client_account(
    managed_project_id: str,
    email: str,
    password: str,
    full_name: str | None = None,
) -> dict:
    account_id = f"ca_{uuid4().hex}"
    now = utc_now_iso()
    normalized_email = email.strip().lower()

    with database_connection() as connection:
        existing = connection.execute(
            """
            SELECT *
            FROM client_accounts
            WHERE LOWER(email) = ?
            """,
            (normalized_email,),
        ).fetchone()

        if existing:
            return row_to_account(existing)

        connection.execute(
            """
            INSERT INTO client_accounts (
                id,
                managed_project_id,
                email,
                full_name,
                password_hash,
                created_at,
                last_login_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                account_id,
                managed_project_id,
                normalized_email,
                full_name,
                hash_password(password),
                now,
                None,
            ),
        )

    return get_client_account_by_email(normalized_email) or {
        "id": account_id,
        "managed_project_id": managed_project_id,
        "email": normalized_email,
        "full_name": full_name,
        "created_at": now,
        "last_login_at": None,
    }


def authenticate_client_account(email: str, password: str) -> dict | None:
    normalized_email = email.strip().lower()
    now = utc_now_iso()

    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM client_accounts
            WHERE LOWER(email) = ?
            """,
            (normalized_email,),
        ).fetchone()

        if row is None:
            return None

        if not verify_password(password, row["password_hash"]):
            return None

        connection.execute(
            """
            UPDATE client_accounts
            SET last_login_at = ?
            WHERE id = ?
            """,
            (now, row["id"]),
        )

    return get_client_account_by_email(normalized_email)
