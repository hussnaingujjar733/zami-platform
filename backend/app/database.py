from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


BACKEND_ROOT = Path(__file__).resolve().parents[1]
DATA_DIRECTORY = BACKEND_ROOT / "data"
DATA_DIRECTORY.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = Path(
    os.getenv(
        "ZAMI_DATABASE_PATH",
        str(DATA_DIRECTORY / "zami.db"),
    )
)


@contextmanager
def database_connection() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(
        DATABASE_PATH,
        timeout=20,
    )

    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_database() -> None:
    with database_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'draft',
                address_label TEXT,
                address_json TEXT NOT NULL DEFAULT '{}',
                snapshot_json TEXT NOT NULL DEFAULT '{}',
                answers_json TEXT NOT NULL DEFAULT '{}',
                report_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_projects_updated_at
            ON projects(updated_at DESC);

            CREATE INDEX IF NOT EXISTS idx_projects_status
            ON projects(status);
            """
        )
