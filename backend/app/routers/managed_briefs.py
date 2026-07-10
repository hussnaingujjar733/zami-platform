from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from app.managed_brief_store import (
    get_managed_project_brief,
    save_managed_project_brief,
)
from app.managed_project_store import get_managed_project
from app.routers.managed_projects import require_team_access
from app.services.managed_project_brief import build_managed_project_brief
from app.services.managed_project_brief_pdf import build_managed_project_brief_pdf


router = APIRouter(
    prefix="/managed-projects/{managed_project_id}/brief",
    tags=["managed-project-briefs"],
)


@router.get("")
def get_project_brief(
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
        "brief": get_managed_project_brief(managed_project_id),
    }


@router.post("/run")
def run_project_brief(
    managed_project_id: str,
    _team_access: None = Depends(require_team_access),
) -> dict:
    try:
        generated = build_managed_project_brief(managed_project_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    brief = save_managed_project_brief(
        managed_project_id=managed_project_id,
        brief=generated,
    )

    return {
        "success": True,
        "brief": brief,
    }


@router.get("/report.pdf")
def download_project_brief_pdf(
    managed_project_id: str,
    _team_access: None = Depends(require_team_access),
) -> Response:
    project = get_managed_project(managed_project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    brief = get_managed_project_brief(managed_project_id)

    if brief is None:
        generated = build_managed_project_brief(managed_project_id)
        brief = save_managed_project_brief(
            managed_project_id=managed_project_id,
            brief=generated,
        )

    pdf_bytes = build_managed_project_brief_pdf(
        managed_project_id=managed_project_id,
        brief=brief,
    )

    filename = f"zami-dossier-projet-{managed_project_id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
