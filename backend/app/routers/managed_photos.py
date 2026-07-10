from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.managed_photo_store import (
    get_managed_photo,
    list_managed_photos,
    save_managed_photo,
)
from app.managed_project_store import get_managed_project, verify_client_access
from app.routers.managed_projects import require_team_access

router = APIRouter(tags=["managed-photos"])


@router.get("/managed-projects/{project_id}/photos")
def list_team_photos(
    project_id: str,
    _team_access: None = Depends(require_team_access),
) -> dict:
    project = get_managed_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande introuvable.",
        )

    return {
        "success": True,
        "photos": list_managed_photos(project_id),
    }


@router.post("/managed-projects/{project_id}/photos")
def upload_team_photo(
    project_id: str,
    title: str = Form(""),
    caption: str = Form(""),
    file: UploadFile = File(...),
    _team_access: None = Depends(require_team_access),
) -> dict:
    project = get_managed_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande introuvable.",
        )

    try:
        photo = save_managed_photo(project_id, file, title, caption)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    return {
        "success": True,
        "photo": photo,
    }


@router.get("/managed-projects/{project_id}/photos/{photo_id}/file")
def download_team_photo(
    project_id: str,
    photo_id: str,
    _team_access: None = Depends(require_team_access),
) -> FileResponse:
    photo = get_managed_photo(photo_id)

    if photo is None or photo["managed_project_id"] != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo introuvable.",
        )

    file_path = Path(photo["file_path"])

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable.",
        )

    return FileResponse(
        file_path,
        media_type=photo.get("content_type") or "image/jpeg",
        filename=photo.get("original_filename") or file_path.name,
    )


@router.get("/client-projects/{project_id}/photos")
def list_client_photos(
    project_id: str,
    token: str = Query(..., min_length=20),
) -> dict:
    project = verify_client_access(project_id, token)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lien de suivi invalide ou expiré.",
        )

    photos = list_managed_photos(project_id)

    public_photos = [
        {
            "id": photo["id"],
            "title": photo.get("title"),
            "caption": photo.get("caption"),
            "created_at": photo.get("created_at"),
            "image_path": f"/client-projects/{project_id}/photos/{photo['id']}/file?token={token}",
        }
        for photo in photos
    ]

    return {
        "success": True,
        "photos": public_photos,
    }


@router.get("/client-projects/{project_id}/photos/{photo_id}/file")
def view_client_photo(
    project_id: str,
    photo_id: str,
    token: str = Query(..., min_length=20),
) -> FileResponse:
    project = verify_client_access(project_id, token)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lien de suivi invalide ou expiré.",
        )

    photo = get_managed_photo(photo_id)

    if photo is None or photo["managed_project_id"] != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo introuvable.",
        )

    file_path = Path(photo["file_path"])

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable.",
        )

    return FileResponse(
        file_path,
        media_type=photo.get("content_type") or "image/jpeg",
        filename=photo.get("original_filename") or file_path.name,
    )
