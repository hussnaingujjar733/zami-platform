from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from app.evidence_store import (
    UPLOAD_ROOT,
    delete_evidence,
    insert_evidence,
    list_evidence,
)
from app.repositories.projects import get_project


router = APIRouter(
    prefix="/projects/{project_id}/evidence",
    tags=["project-evidence"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

DOCUMENT_TYPES = {
    "dpe",
    "energy_audit",
    "energy_bill",
    "quote",
    "insurance_certificate",
    "rge_certificate",
    "company_registration",
    "artisan_proof",
}

PHOTO_TYPES = {
    "facade",
    "windows",
    "roof_attic",
    "heating_system",
    "humidity",
    "other_photo",
}

SUPPORTED_TYPES = DOCUMENT_TYPES | PHOTO_TYPES

EXTENSIONS = {
    "pdf": ".pdf",
    "jpeg": ".jpg",
    "png": ".png",
    "webp": ".webp",
}

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_identifier(value: str) -> str:
    clean = value.strip()

    if not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiant invalide.",
        )

    return clean


def safe_filename(filename: str | None) -> str:
    original = Path(filename or "fichier").name
    cleaned = re.sub(
        r"[^A-Za-z0-9À-ÿ._ -]+",
        "_",
        original,
    )

    return cleaned[:180] or "fichier"


def detect_file_kind(header: bytes) -> str | None:
    if header.startswith(b"%PDF"):
        return "pdf"

    if header.startswith(b"\xff\xd8\xff"):
        return "jpeg"

    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"

    if (
        len(header) >= 12
        and header[:4] == b"RIFF"
        and header[8:12] == b"WEBP"
    ):
        return "webp"

    return None


def require_project(project_id: str) -> str:
    clean_project_id = validate_identifier(project_id)

    if get_project(clean_project_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return clean_project_id


@router.get("")
def get_project_evidence(project_id: str) -> dict:
    clean_project_id = require_project(project_id)
    evidence = list_evidence(clean_project_id)

    return {
        "project_id": clean_project_id,
        "evidence": evidence,
        "total": len(evidence),
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def upload_project_evidence(
    project_id: str,
    evidence_type: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
) -> dict:
    clean_project_id = require_project(project_id)
    clean_type = evidence_type.strip()

    if clean_type not in SUPPORTED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type de preuve non pris en charge.",
        )

    original_filename = safe_filename(file.filename)
    evidence_id = f"evd_{uuid4().hex}"

    project_directory = UPLOAD_ROOT / clean_project_id
    project_directory.mkdir(parents=True, exist_ok=True)

    temporary_path = project_directory / f"{evidence_id}.upload"

    size_bytes = 0
    first_bytes = b""
    hasher = hashlib.sha256()

    try:
        with temporary_path.open("wb") as destination:
            while True:
                chunk = await file.read(CHUNK_SIZE)

                if not chunk:
                    break

                if not first_bytes:
                    first_bytes = chunk[:32]

                size_bytes += len(chunk)

                if size_bytes > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Le fichier dépasse la limite de 10 Mo.",
                    )

                hasher.update(chunk)
                destination.write(chunk)

    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise

    finally:
        await file.close()

    if size_bytes == 0:
        temporary_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier est vide.",
        )

    detected_kind = detect_file_kind(first_bytes)

    if detected_kind is None:
        temporary_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Format non reconnu.",
        )

    if (
        clean_type in PHOTO_TYPES
        and detected_kind == "pdf"
    ):
        temporary_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Une photographie doit être au format image.",
        )

    stored_filename = (
        f"{evidence_id}{EXTENSIONS[detected_kind]}"
    )

    stored_path = project_directory / stored_filename
    temporary_path.replace(stored_path)

    record = {
        "id": evidence_id,
        "project_id": clean_project_id,
        "evidence_type": clean_type,
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "content_type": CONTENT_TYPES[detected_kind],
        "file_kind": detected_kind,
        "size_bytes": size_bytes,
        "sha256": hasher.hexdigest(),
        "source_type": (
            "document"
            if clean_type in DOCUMENT_TYPES
            else "photo"
        ),
        "verification_status": "uploaded",
        "analysis_status": "pending",
        "verified": False,
        "uploaded_at": utc_now_iso(),
        "metadata": {},
    }

    try:
        saved = insert_evidence(record)
    except Exception:
        stored_path.unlink(missing_ok=True)
        raise

    return {
        "success": True,
        "evidence": saved,
        "message": (
            "Fichier enregistré. Analyse du contenu en attente."
        ),
    }


@router.delete("/{evidence_id}")
def delete_project_evidence(
    project_id: str,
    evidence_id: str,
) -> dict:
    clean_project_id = require_project(project_id)
    clean_evidence_id = validate_identifier(evidence_id)

    deleted = delete_evidence(
        clean_project_id,
        clean_evidence_id,
    )

    if deleted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable.",
        )

    project_directory = UPLOAD_ROOT / clean_project_id

    stored_filename = Path(
        deleted["stored_filename"]
    ).name

    stored_path = project_directory / stored_filename
    stored_path.unlink(missing_ok=True)

    return {
        "success": True,
        "deleted_evidence_id": clean_evidence_id,
    }

@router.get("/{evidence_id}/file")
def download_evidence_file(
    project_id: str,
    evidence_id: str,
):
    evidence_items = list_evidence(project_id)

    evidence = next(
        (
            item
            for item in evidence_items
            if item.get("id") == evidence_id
        ),
        None,
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable.",
        )

    stored_filename = Path(str(evidence.get("stored_filename", ""))).name

    if not stored_filename:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nom de fichier invalide.",
        )

    file_path = UPLOAD_ROOT / project_id / stored_filename

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier absent du serveur.",
        )

    return FileResponse(
        path=file_path,
        filename=evidence.get("original_filename") or stored_filename,
        media_type=evidence.get("mime_type") or "application/octet-stream",
    )

