from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.database import database_connection

UPLOAD_ROOT = Path("data/managed_photos")
ALLOWED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_managed_project_photos_table() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

    with database_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS managed_project_photos (
                id TEXT PRIMARY KEY,
                managed_project_id TEXT NOT NULL,
                title TEXT,
                caption TEXT,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                content_type TEXT,
                file_path TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_managed_project_photos_project
            ON managed_project_photos(managed_project_id)
            """
        )


def row_to_photo(row) -> dict:
    return {
        "id": row["id"],
        "managed_project_id": row["managed_project_id"],
        "title": row["title"],
        "caption": row["caption"],
        "original_filename": row["original_filename"],
        "stored_filename": row["stored_filename"],
        "content_type": row["content_type"],
        "file_path": row["file_path"],
        "created_at": row["created_at"],
    }


def save_managed_photo(
    managed_project_id: str,
    upload: UploadFile,
    title: str = "",
    caption: str = "",
) -> dict:
    original_name = upload.filename or "photo.jpg"
    suffix = Path(original_name).suffix.lower()

    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError("Format photo non supporté. Utilisez PNG, JPG ou WEBP.")

    photo_id = f"pho_{uuid4().hex}"
    now = utc_now_iso()
    project_dir = UPLOAD_ROOT / managed_project_id
    project_dir.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{photo_id}{suffix}"
    file_path = project_dir / stored_filename

    with file_path.open("wb") as output:
        shutil.copyfileobj(upload.file, output)

    with database_connection() as connection:
        connection.execute(
            """
            INSERT INTO managed_project_photos (
                id,
                managed_project_id,
                title,
                caption,
                original_filename,
                stored_filename,
                content_type,
                file_path,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                photo_id,
                managed_project_id,
                title.strip(),
                caption.strip(),
                original_name,
                stored_filename,
                upload.content_type,
                str(file_path),
                now,
            ),
        )

    return {
        "id": photo_id,
        "managed_project_id": managed_project_id,
        "title": title.strip(),
        "caption": caption.strip(),
        "original_filename": original_name,
        "stored_filename": stored_filename,
        "content_type": upload.content_type,
        "file_path": str(file_path),
        "created_at": now,
    }


def list_managed_photos(managed_project_id: str) -> list[dict]:
    with database_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM managed_project_photos
            WHERE managed_project_id = ?
            ORDER BY created_at DESC
            """,
            (managed_project_id,),
        ).fetchall()

    return [row_to_photo(row) for row in rows]


def get_managed_photo(photo_id: str) -> dict | None:
    with database_connection() as connection:
        row = connection.execute(
            """
            SELECT *
            FROM managed_project_photos
            WHERE id = ?
            """,
            (photo_id,),
        ).fetchone()

    return row_to_photo(row) if row else None
