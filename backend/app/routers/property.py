from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.schemas.property import (
    DataPoint,
    PropertySnapshotRequest,
    PropertySnapshotResponse,
    SourceReference,
)
from app.services.ademe_dpe import (
    ADEME_DATASET_NAME,
    find_dpe_for_address,
)
from app.services.geocoding import (
    AddressNotFoundError,
    ExternalServiceError,
    geocode_french_address,
    suggest_french_addresses,
)


router = APIRouter(
    prefix="/property",
    tags=["property"],
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)



@router.get("/address-suggestions")
async def get_address_suggestions(
    q: str = Query(
        min_length=3,
        max_length=120,
        description="Texte saisi par l’utilisateur",
    ),
) -> dict:
    try:
        suggestions = await suggest_french_addresses(
            query=q,
            limit=5,
        )

    except ExternalServiceError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Le service officiel de recherche d’adresses "
                "est temporairement indisponible."
            ),
        ) from exc

    return {
        "query": q,
        "suggestions": suggestions,
        "source": {
            "name": "IGN Géoplateforme",
            "dataset": "Base Adresse Nationale",
            "official": True,
        },
    }


@router.post(
    "/snapshot",
    response_model=PropertySnapshotResponse,
)
async def create_property_snapshot(
    request: PropertySnapshotRequest,
) -> PropertySnapshotResponse:
    try:
        address = await geocode_french_address(request.address)

    except AddressNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except ExternalServiceError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "Le service officiel de validation d’adresse "
                "est temporairement indisponible."
            ),
        ) from exc

    address_retrieved_at = utc_now()

    address_point = DataPoint(
        value=address,
        status="available",
        source_type="official",
        source_name="IGN Géoplateforme",
        dataset="Base Adresse Nationale",
        retrieved_at=address_retrieved_at,
        confidence=(
            "high"
            if address["score"] >= 0.75
            else "medium"
        ),
        verified=address["score"] >= 0.65,
        message=None,
    )

    dpe_point = await find_dpe_for_address(
        normalized_address=address["label"],
        postcode=address.get("postcode"),
        citycode=address.get("citycode"),
        city=address.get("city"),
    )

    completeness = 35

    if address.get("housenumber"):
        completeness += 5

    if address.get("postcode"):
        completeness += 5

    if (
        dpe_point.status == "available"
        and dpe_point.verified
    ):
        completeness += 20

    completeness = min(completeness, 65)

    if (
        dpe_point.status == "available"
        and dpe_point.verified
        and dpe_point.confidence == "high"
    ):
        analysis_confidence = "medium"
    else:
        analysis_confidence = "low"

    missing_information = [
        "Type exact du logement",
        "Surface habitable confirmée",
        "Système de chauffage principal",
        "État connu de l’isolation",
        "Facture énergétique annuelle",
    ]

    recommended_questions = [
        "S’agit-il d’une maison individuelle ou d’un appartement ?",
        "Quelle est la surface habitable du logement ?",
        "Quel est le système de chauffage principal ?",
        "Connaissez-vous l’état de l’isolation des murs et de la toiture ?",
        "Quel est le montant approximatif de la facture énergétique annuelle ?",
    ]

    if dpe_point.status != "available":
        missing_information.insert(
            0,
            "DPE officiel ou document DPE fourni par le propriétaire",
        )

        recommended_questions.insert(
            0,
            "Possédez-vous un DPE ou un audit énergétique ?",
        )

    sources = [
        SourceReference(
            name="IGN Géoplateforme",
            type="official",
            dataset="Base Adresse Nationale",
            retrieved_at=address_retrieved_at,
            official=True,
        ),
        SourceReference(
            name="ADEME",
            type="official",
            dataset=ADEME_DATASET_NAME,
            retrieved_at=dpe_point.retrieved_at,
            official=True,
        ),
    ]

    return PropertySnapshotResponse(
        address=address_point,
        dpe=dpe_point,
        data_completeness=completeness,
        analysis_confidence=analysis_confidence,
        verification_status="identification_initiale",
        missing_information=missing_information,
        recommended_next_questions=recommended_questions,
        sources=sources,
    )
