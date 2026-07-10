from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from app.repositories.projects import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_json_field,
    update_project_status,
)
from app.schemas.project import (
    ProjectAnswersPatchRequest,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectReportPatchRequest,
    ProjectResponse,
    ProjectSnapshotPatchRequest,
    ProjectStatusPatchRequest,
)


router = APIRouter(
    prefix="/projects",
    tags=["projects"],
)


def require_project(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return project


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project_endpoint(
    payload: ProjectCreateRequest,
) -> dict:
    return create_project(
        address_label=payload.address_label,
        address=payload.address,
        snapshot=payload.snapshot,
    )


@router.get(
    "",
    response_model=ProjectListResponse,
)
def list_projects_endpoint(
    limit: int = Query(default=50, ge=1, le=100),
) -> dict:
    projects = list_projects(limit=limit)

    return {
        "projects": projects,
        "total": len(projects),
    }


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
def get_project_endpoint(project_id: str) -> dict:
    return require_project(project_id)


@router.patch(
    "/{project_id}/snapshot",
    response_model=ProjectResponse,
)
def update_snapshot_endpoint(
    project_id: str,
    payload: ProjectSnapshotPatchRequest,
) -> dict:
    project = update_json_field(
        project_id,
        "snapshot_json",
        payload.snapshot,
        merge=False,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return project


@router.patch(
    "/{project_id}/answers",
    response_model=ProjectResponse,
)
def update_answers_endpoint(
    project_id: str,
    payload: ProjectAnswersPatchRequest,
) -> dict:
    project = update_json_field(
        project_id,
        "answers_json",
        payload.answers,
        merge=True,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return project


@router.patch(
    "/{project_id}/report",
    response_model=ProjectResponse,
)
def update_report_endpoint(
    project_id: str,
    payload: ProjectReportPatchRequest,
) -> dict:
    project = update_json_field(
        project_id,
        "report_json",
        payload.report,
        merge=False,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return project


@router.patch(
    "/{project_id}/status",
    response_model=ProjectResponse,
)
def update_status_endpoint(
    project_id: str,
    payload: ProjectStatusPatchRequest,
) -> dict:
    project = update_project_status(
        project_id,
        payload.status,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return project


@router.delete("/{project_id}")
def delete_project_endpoint(project_id: str) -> dict:
    deleted = delete_project(project_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    return {
        "success": True,
        "deleted_project_id": project_id,
    }
