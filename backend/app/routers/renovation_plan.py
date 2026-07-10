from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.evidence_store import list_evidence
from app.renovation_plan_store import (
    get_renovation_plan,
    save_renovation_plan,
)
from app.repositories.projects import get_project
from app.services.renovation_plan import generate_renovation_plan


router = APIRouter(
    prefix="/projects",
    tags=["renovation-plan"],
)


@router.post("/{project_id}/renovation-plan/run")
def run_renovation_plan(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    evidence = list_evidence(project_id)

    plan = generate_renovation_plan(
        project,
        evidence_count=len(evidence),
    )

    saved = save_renovation_plan(project_id, plan)

    return {
        "success": True,
        **saved,
    }


@router.get("/{project_id}/renovation-plan")
def read_renovation_plan(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    plan = get_renovation_plan(project_id)

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun plan n'a encore été généré.",
        )

    return plan
