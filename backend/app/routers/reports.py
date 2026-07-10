from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.analysis_store import get_analysis
from app.evidence_store import list_evidence
from app.repositories.projects import get_project
from app.quote_check_store import get_quote_check
from app.renovation_plan_store import get_renovation_plan
from app.services.project_pdf import generate_project_pdf


router = APIRouter(
    prefix="/projects",
    tags=["project-reports"],
)


@router.get("/{project_id}/report.pdf")
def download_project_pdf(project_id: str):
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    evidence = list_evidence(project_id)
    analysis = get_analysis(project_id)
    renovation_plan = get_renovation_plan(project_id)
    quote_check = get_quote_check(project_id)

    try:
        pdf_bytes = generate_project_pdf(
            project,
            evidence,
            analysis,
            renovation_plan,
            quote_check,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Le rapport PDF n'a pas pu être généré.",
        ) from error

    filename = f"ZAMI_Rapport_{project_id[:18]}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            ),
            "Content-Length": str(len(pdf_bytes)),
            "X-Content-Type-Options": "nosniff",
        },
    )
