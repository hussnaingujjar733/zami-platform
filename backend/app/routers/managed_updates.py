from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.managed_project_store import get_managed_project, verify_client_access
from app.managed_update_store import create_project_update, list_project_updates
from app.routers.managed_projects import require_team_access

router = APIRouter(tags=["managed-updates"])


class ProjectUpdatePayload(BaseModel):
    title: str = Field(..., min_length=2)
    message: str = Field(..., min_length=2)
    visibility: str = "client"


@router.get("/managed-projects/{project_id}/updates")
def list_team_project_updates(
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
        "updates": list_project_updates(project_id),
    }


@router.post("/managed-projects/{project_id}/updates")
def add_team_project_update(
    project_id: str,
    payload: ProjectUpdatePayload,
    _team_access: None = Depends(require_team_access),
) -> dict:
    project = get_managed_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande introuvable.",
        )

    update = create_project_update(
        project_id,
        payload.title,
        payload.message,
        payload.visibility,
    )

    return {
        "success": True,
        "update": update,
    }


@router.get("/client-projects/{project_id}/updates")
def list_client_project_updates(
    project_id: str,
    token: str = Query(..., min_length=20),
) -> dict:
    project = verify_client_access(project_id, token)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lien de suivi invalide ou expiré.",
        )

    return {
        "success": True,
        "updates": list_project_updates(project_id, client_visible_only=True),
    }
