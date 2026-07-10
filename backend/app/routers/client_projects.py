from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from app.managed_brief_store import get_managed_project_brief
from app.managed_document_store import (
    insert_managed_document,
    list_managed_documents,
)
from app.managed_project_store import (
    get_managed_project_by_reference_email,
    public_project_view,
    rotate_client_access_token,
    touch_client_last_seen,
    verify_client_access,
)


UPLOAD_ROOT = Path(__file__).resolve().parents[2] / "data" / "managed_uploads"

router = APIRouter(
    prefix="/client-projects",
    tags=["client-projects"],
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


def require_client_project(project_id: str, token: str) -> dict:
    project = verify_client_access(project_id, token)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Lien client invalide ou expiré.",
        )

    touch_client_last_seen(project_id)

    return project


def public_document_view(document: dict) -> dict:
    return {
        "id": document["id"],
        "managed_project_id": document["managed_project_id"],
        "document_type": document["document_type"],
        "original_filename": document["original_filename"],
        "file_kind": document["file_kind"],
        "size_bytes": document["size_bytes"],
        "created_at": document["created_at"],
    }


def public_brief_view(brief: dict | None) -> dict | None:
    if brief is None:
        return None

    return {
        "readiness_score": brief["readiness_score"],
        "risk_level": brief["risk_level"],
        "summary": brief["summary"],
        "missing_documents": brief["missing_documents"],
        "priority_actions": brief["priority_actions"],
        "updated_at": brief["updated_at"],
    }




@router.post("/lookup")
def lookup_client_project(payload: dict) -> dict:
    public_reference = str(payload.get("public_reference") or "").strip()
    contact_email = str(payload.get("contact_email") or "").strip()

    if not public_reference or not contact_email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Numéro de demande et email requis.",
        )

    project = get_managed_project_by_reference_email(
        public_reference=public_reference,
        contact_email=contact_email,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune demande trouvée avec ce numéro et cet email.",
        )

    access = rotate_client_access_token(project["id"])

    return {
        "success": True,
        "project": public_project_view(project),
        "client_portal_path": access["client_portal_path"],
    }


@router.get("/{project_id}")
def get_client_project(
    project_id: str,
    token: str = Query(...),
) -> dict:
    project = require_client_project(project_id, token)
    documents = list_managed_documents(project_id)
    brief = get_managed_project_brief(project_id)

    return {
        "project": public_project_view(project),
        "documents": [public_document_view(document) for document in documents],
        "brief": public_brief_view(brief),
    }


@router.post("/{project_id}/documents")
async def upload_client_project_document(
    project_id: str,
    token: str = Query(...),
    document_type: str = Form("other"),
    file: UploadFile = File(...),
) -> dict:
    require_client_project(project_id, token)

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

    project_dir = UPLOAD_ROOT / project_id
    project_dir.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid4().hex}_{safe_filename(original_filename)}"
    destination = project_dir / stored_filename
    destination.write_bytes(content)

    document = insert_managed_document(
        managed_project_id=project_id,
        document_type=document_type,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_kind=detect_file_kind(original_filename),
        size_bytes=len(content),
        metadata={
            "content_type": file.content_type,
            "uploaded_by": "client",
        },
    )

    return {
        "success": True,
        "document": public_document_view(document),
    }
