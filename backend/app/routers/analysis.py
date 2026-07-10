from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.analysis_store import (
    get_analysis,
    save_analysis,
)
from app.repositories.projects import get_project
from app.services.renovation_analysis import (
    AnalysisInputError,
    run_renovation_analysis,
)


router = APIRouter(
    prefix="/projects",
    tags=["project-analysis"],
)


@router.post("/{project_id}/analysis/run")
def run_project_analysis(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    try:
        result = run_renovation_analysis(project)

    except AnalysisInputError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "analysis_inputs_missing",
                "message": error.message,
                "missing": error.missing,
            },
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "analysis_model_unavailable",
                "message": (
                    "Le modèle d'analyse est temporairement "
                    "indisponible."
                ),
            },
        ) from error

    saved = save_analysis(project_id, result)

    return {
        "success": True,
        **saved,
    }


@router.get("/{project_id}/analysis")
def get_project_analysis(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    analysis = get_analysis(project_id)

    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Aucune analyse n'a encore été générée."
            ),
        )

    return analysis
