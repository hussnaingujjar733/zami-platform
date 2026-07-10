from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

from app.managed_document_store import (
    get_managed_document,
    insert_managed_document,
    list_managed_documents,
)
from app.managed_project_store import get_managed_project
from app.routers.managed_projects import require_team_access


UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "data" / "managed_uploads"

router = APIRouter(
    prefix="/managed-projects/{managed_project_id}/documents",
    tags=["managed-project-documents"],
)

ALLOWED_SUFFIXES = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".heic",
    ".txt",
}


def safe_filename(filename: str) -> str:
    clean = re.sub(r"[^A-Za-z0-9_.-]+", "_", filename.strip())
    return clean[:140] or "document"


def detect_file_kind(filename: str) -> str:
    suffix = Path(filename).suffix.lower()

    if suffix == ".pdf":
        return "pdf"

    if suffix in {".png", ".jpg", ".jpeg", ".webp", ".heic"}:
        return "image"

    return "document"


@router.post("")
async def upload_managed_project_document(
    managed_project_id: str,
    document_type: str = Form("other"),
    file: UploadFile = File(...),
) -> dict:
    project = get_managed_project(managed_project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    original_filename = file.filename or "document"
    suffix = Path(original_filename).suffix.lower()

    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté. Utilisez PDF, image ou TXT.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier vide.",
        )

    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Fichier trop volumineux. Limite: 15 MB.",
        )

    project_dir = UPLOAD_ROOT / managed_project_id
    project_dir.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid4().hex}_{safe_filename(original_filename)}"
    destination = project_dir / stored_filename
    destination.write_bytes(content)

    document = insert_managed_document(
        managed_project_id=managed_project_id,
        document_type=document_type,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_kind=detect_file_kind(original_filename),
        size_bytes=len(content),
        metadata={
            "content_type": file.content_type,
        },
    )

    return {
        "success": True,
        "document": document,
    }


@router.get("")
def list_project_documents(
    managed_project_id: str,
    _team_access: None = Depends(require_team_access),
) -> dict:
    project = get_managed_project(managed_project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return {
        "documents": list_managed_documents(managed_project_id),
    }


@router.get("/{document_id}/file")
def get_project_document_file(
    managed_project_id: str,
    document_id: str,
    _team_access: None = Depends(require_team_access),
) -> FileResponse:
    document = get_managed_document(document_id)

    if document is None or document["managed_project_id"] != managed_project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document introuvable.",
        )

    path = UPLOAD_ROOT / managed_project_id / document["stored_filename"]

    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable.",
        )

    return FileResponse(
        path,
        filename=document["original_filename"],
        media_type="application/octet-stream",
    )
