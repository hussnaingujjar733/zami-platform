from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, Body, HTTPException, status
from fastapi.responses import StreamingResponse

from app.evidence_store import list_evidence
from app.quote_check_store import (
    delete_quote_check,
    get_quote_check,
    save_quote_check,
)
from app.repositories.projects import get_project
from app.services.quote_check_pdf import generate_quote_check_pdf
from app.services.company_verification import verify_company_identifier
from app.services.quote_check import (
    QuoteCheckInputError,
    run_quote_check,
)


router = APIRouter(
    prefix="/projects",
    tags=["quote-check"],
)


@router.post("/{project_id}/quote-check/run")
def run_project_quote_check(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    evidence = list_evidence(project_id)

    try:
        quote_check = run_quote_check(
            project_id,
            evidence,
        )
    except QuoteCheckInputError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "quote_check_inputs_missing",
                "message": error.message,
                "missing": error.missing,
            },
        ) from error

    saved = save_quote_check(project_id, quote_check)

    return {
        "success": True,
        **saved,
    }


@router.get("/{project_id}/quote-check")
def get_project_quote_check(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    quote_check = get_quote_check(project_id)

    if quote_check is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune vérification de devis n'a encore été générée.",
        )

    return quote_check

@router.get("/{project_id}/quote-check/report.pdf")
def download_project_quote_check_pdf(project_id: str):
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    quote_check = get_quote_check(project_id)

    if quote_check is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune vérification de devis n'a encore été générée.",
        )

    pdf_bytes = generate_quote_check_pdf(
        project,
        quote_check,
    )

    filename = f"zami-quoteguard-{project_id}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )

@router.post("/{project_id}/quote-check/company-verification")
def verify_project_quote_company_identifier(
    project_id: str,
    payload: dict = Body(...),
) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    quote_check_record = get_quote_check(project_id)

    if quote_check_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune vérification de devis n'a encore été générée.",
        )

    quote_check = quote_check_record.get("quote_check")

    if not isinstance(quote_check, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Résultat QuoteGuard invalide.",
        )

    raw_identifier = str(payload.get("identifier", "")).strip()
    digits = "".join(character for character in raw_identifier if character.isdigit())

    if len(digits) not in {9, 14}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ajoutez un SIREN à 9 chiffres ou un SIRET à 14 chiffres.",
        )

    siren = digits if len(digits) == 9 else digits[:9]
    siret = digits if len(digits) == 14 else None

    official_company_verification = verify_company_identifier(
        siren=siren,
        siret=siret,
    )

    company_identifiers = quote_check.get("company_identifiers")

    if not isinstance(company_identifiers, dict):
        company_identifiers = {}

    company_identifiers.update(
        {
            "siren": siren,
            "siret": siret,
            "detected": True,
            "manual_override": True,
            "official_verification_status": official_company_verification.get("status"),
            "official_name": official_company_verification.get("official_name"),
            "active": official_company_verification.get("active"),
        }
    )

    quote_check["company_identifiers"] = company_identifiers
    quote_check["official_company_verification"] = official_company_verification

    authenticity = quote_check.get("authenticity_assessment")

    if isinstance(authenticity, dict):
        current_score = int(authenticity.get("score", 0))

        if official_company_verification.get("status") == "verified":
            authenticity["score"] = min(100, current_score + 10)
            authenticity["summary"] = (
                "L'identifiant entreprise corrigé a été trouvé dans une source officielle. "
                "RGE, assurance et cohérence du devis restent à vérifier."
            )
        elif official_company_verification.get("status") == "not_found":
            authenticity["score"] = max(0, current_score - 15)
            authenticity["summary"] = (
                "L'identifiant entreprise corrigé n'a pas été trouvé automatiquement. "
                "Vérification manuelle nécessaire."
            )

        quote_check["authenticity_assessment"] = authenticity

    saved = save_quote_check(
        project_id,
        quote_check,
    )

    return {
        "success": True,
        **saved,
    }

@router.delete("/{project_id}/quote-check")
def delete_project_quote_check(project_id: str) -> dict:
    project = get_project(project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable.",
        )

    deleted = delete_quote_check(project_id)

    return {
        "success": True,
        "deleted": deleted,
    }

