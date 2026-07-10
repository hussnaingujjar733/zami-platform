from __future__ import annotations

import os
from typing import Annotated
from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.managed_project_store import (
    create_managed_project,
    get_managed_project,
    list_managed_projects,
    update_managed_project_notification_status,
    update_managed_project_team_fields,
    rotate_client_access_token,
)
from app.services.managed_project_notification import send_admin_notification
from app.services.slack_notification import send_managed_project_slack_notification
from app.services.supabase_leads import sync_managed_project_lead




def require_team_access(
    x_zami_team_key: Annotated[str | None, Header()] = None,
) -> None:
    expected_key = os.getenv("ZAMI_TEAM_ACCESS_KEY", "").strip()

    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Team access key is not configured.",
        )

    if not x_zami_team_key or x_zami_team_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Accès équipe non autorisé.",
        )


router = APIRouter(
    prefix="/managed-projects",
    tags=["managed-projects"],
)


@router.post("")
def create_managed_project_request(payload: dict) -> dict:
    try:
        project = create_managed_project(payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    client_access_token = project.get("client_access_token")
    client_portal_path = project.get("client_portal_path")

    team_notification = send_managed_project_slack_notification(project)
    notification = send_admin_notification(project)
    supabase_sync = sync_managed_project_lead(project)

    update_managed_project_notification_status(
        project["id"],
        notification["status"],
    )

    refreshed_project = get_managed_project(project["id"]) or project

    if client_access_token:
        refreshed_project["client_access_token"] = client_access_token

    if client_portal_path:
        refreshed_project["client_portal_path"] = client_portal_path

    return {
        "success": True,
        "project": refreshed_project,
        "team_notification": team_notification,
        "notification": notification,
        "supabase_sync": supabase_sync,
    }


@router.get("")
def list_managed_project_requests(
    limit: int = 50,
    _team_access: None = Depends(require_team_access),
) -> dict:
    return {
        "projects": list_managed_projects(limit=limit),
    }


@router.get("/{project_id}")
def get_managed_project_request(
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
        "project": project,
    }


@router.patch("/{project_id}")
def update_managed_project_request(
    project_id: str,
    payload: dict,
    _team_access: None = Depends(require_team_access),
) -> dict:
    try:
        project = update_managed_project_team_fields(
            project_id=project_id,
            status_value=str(payload.get("status") or "received"),
            internal_note=str(payload.get("internal_note") or ""),
            next_action=str(payload.get("next_action") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande introuvable.",
        )

    return {
        "success": True,
        "project": project,
    }

@router.post("/{project_id}/client-link")
def generate_client_tracking_link(
    project_id: str,
    _team_access: None = Depends(require_team_access),
) -> dict:
    project = get_managed_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande introuvable.",
        )

    access = rotate_client_access_token(project_id)

    return {
        "success": True,
        "project_id": project_id,
        "public_reference": project.get("public_reference"),
        "client_portal_path": access["client_portal_path"],
    }

