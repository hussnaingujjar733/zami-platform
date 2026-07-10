from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any

from app.schemas.property import DataPoint
from app.services.http_json import ExternalServiceError, get_json


ADEME_DPE_LINES_URL = (
    "https://data.ademe.fr/data-fair/api/v1/"
    "datasets/dpe03existant/lines"
)

ADEME_DATASET_NAME = (
    "DPE Logements existants depuis juillet 2021"
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_text(value: Any) -> str:
    text = str(value or "").strip().lower()

    text = unicodedata.normalize("NFKD", text)
    text = "".join(
        character
        for character in text
        if not unicodedata.combining(character)
    )

    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def first_value(
    record: dict[str, Any],
    *field_names: str,
) -> Any | None:
    for field_name in field_names:
        value = record.get(field_name)

        if value is not None and str(value).strip():
            return value

    return None


def extract_house_number(value: Any) -> str | None:
    match = re.match(r"^\s*(\d+[a-zA-Z]?)", str(value or ""))

    if not match:
        return None

    return normalize_text(match.group(1))


def normalize_street(
    value: Any,
    postcode: str | None = None,
    city: str | None = None,
) -> str:
    text = normalize_text(value)

    text = re.sub(r"^\d+[a-z]?\s+", "", text)

    if postcode:
        text = re.sub(
            rf"\b{re.escape(normalize_text(postcode))}\b",
            " ",
            text,
        )

    if city:
        normalized_city = normalize_text(city)

        if normalized_city:
            text = re.sub(
                rf"\b{re.escape(normalized_city)}\b",
                " ",
                text,
            )

    return re.sub(r"\s+", " ", text).strip()


def record_postcode(record: dict[str, Any]) -> str | None:
    value = first_value(
        record,
        "code_postal_ban",
        "code_postal_brut",
        "code_postal",
    )

    return str(value).strip() if value is not None else None


def record_citycode(record: dict[str, Any]) -> str | None:
    value = first_value(
        record,
        "code_insee_ban",
        "code_commune_insee",
        "code_insee_commune",
        "code_insee",
    )

    return str(value).strip() if value is not None else None


def record_city(record: dict[str, Any]) -> str | None:
    value = first_value(
        record,
        "nom_commune_ban",
        "nom_commune_brut",
        "nom_commune",
    )

    return str(value).strip() if value is not None else None


def record_address(record: dict[str, Any]) -> str | None:
    value = first_value(
        record,
        "adresse_ban",
        "adresse_brut",
    )

    return str(value).strip() if value is not None else None


def record_street(record: dict[str, Any]) -> str | None:
    value = first_value(
        record,
        "nom_rue",
        "adresse_ban",
        "adresse_brut",
    )

    return str(value).strip() if value is not None else None


def date_sort_value(value: Any) -> str:
    return str(value or "")


def is_collective_property(record: dict[str, Any]) -> bool:
    building_type = normalize_text(
        first_value(
            record,
            "type_batiment",
            "type_installation_chauffage",
        )
    )

    return any(
        keyword in building_type
        for keyword in (
            "appartement",
            "immeuble",
            "collectif",
        )
    )


def strict_match_score(
    target_address: str,
    target_postcode: str | None,
    target_citycode: str | None,
    target_city: str | None,
    record: dict[str, Any],
) -> tuple[float, bool]:
    candidate_address = record_address(record)
    candidate_street = record_street(record)

    if not candidate_address or not candidate_street:
        return 0.0, False

    target_number = extract_house_number(target_address)
    candidate_number = extract_house_number(candidate_address)

    candidate_postcode = record_postcode(record)
    candidate_citycode = record_citycode(record)
    candidate_city = record_city(record)

    target_street = normalize_street(
        target_address,
        target_postcode,
        target_city,
    )

    normalized_candidate_street = normalize_street(
        candidate_street,
        candidate_postcode,
        candidate_city,
    )

    street_similarity = SequenceMatcher(
        None,
        target_street,
        normalized_candidate_street,
    ).ratio()

    postcode_exact = bool(
        target_postcode
        and candidate_postcode
        and str(target_postcode) == str(candidate_postcode)
    )

    number_exact = bool(
        target_number
        and candidate_number
        and target_number == candidate_number
    )

    citycode_consistent = True

    if target_citycode and candidate_citycode:
        citycode_consistent = (
            str(target_citycode) == str(candidate_citycode)
        )

    city_consistent = True

    if target_city and candidate_city:
        city_consistent = (
            normalize_text(target_city)
            == normalize_text(candidate_city)
        )

    strict_match = (
        postcode_exact
        and number_exact
        and street_similarity >= 0.82
        and citycode_consistent
        and city_consistent
    )

    score = (
        street_similarity * 0.70
        + (0.12 if postcode_exact else 0)
        + (0.12 if number_exact else 0)
        + (0.06 if citycode_consistent and city_consistent else 0)
    )

    return min(round(score, 3), 1.0), strict_match


def dpe_not_found(message: str) -> DataPoint:
    return DataPoint(
        value=None,
        status="not_found",
        source_type="official",
        source_name="ADEME",
        dataset=ADEME_DATASET_NAME,
        retrieved_at=utc_now(),
        confidence="unknown",
        verified=False,
        message=message,
    )


def dpe_unavailable(message: str) -> DataPoint:
    return DataPoint(
        value=None,
        status="unavailable",
        source_type="official",
        source_name="ADEME",
        dataset=ADEME_DATASET_NAME,
        retrieved_at=utc_now(),
        confidence="unknown",
        verified=False,
        message=message,
    )


async def find_dpe_for_address(
    normalized_address: str,
    postcode: str | None,
    citycode: str | None,
    city: str | None,
) -> DataPoint:
    try:
        payload = await get_json(
            ADEME_DPE_LINES_URL,
            {
                "q": normalized_address,
                "q_fields": "adresse_ban,adresse_brut",
                "size": 50,
                "sort": "-date_etablissement_dpe",
            },
            timeout=12,
        )

    except ExternalServiceError:
        return dpe_unavailable(
            "Le service ADEME est temporairement indisponible."
        )

    results = payload.get("results")

    if not isinstance(results, list) or not results:
        return dpe_not_found(
            "Aucun DPE officiel n’a été identifié pour cette adresse."
        )

    exact_candidates: list[
        tuple[float, str, dict[str, Any]]
    ] = []

    for item in results:
        if not isinstance(item, dict):
            continue

        score, strict_match = strict_match_score(
            target_address=normalized_address,
            target_postcode=postcode,
            target_citycode=citycode,
            target_city=city,
            record=item,
        )

        if not strict_match:
            continue

        established_at = first_value(
            item,
            "date_etablissement_dpe",
            "date_reception_dpe",
        )

        exact_candidates.append(
            (
                score,
                date_sort_value(established_at),
                item,
            )
        )

    if not exact_candidates:
        return dpe_not_found(
            "Aucun DPE ne correspond exactement au numéro, à la rue, "
            "au code postal et à la commune de cette adresse."
        )

    exact_candidates.sort(
        key=lambda candidate: (
            candidate[0],
            candidate[1],
        ),
        reverse=True,
    )

    best_score, _, record = exact_candidates[0]

    if is_collective_property(record):
        return dpe_not_found(
            "Un ou plusieurs DPE existent à cette adresse, mais ZAMI "
            "ne peut pas identifier de manière fiable l’appartement "
            "concerné sans le document DPE ou son numéro officiel."
        )

    matched_address = record_address(record)

    value = {
        "dpe_number": first_value(
            record,
            "numero_dpe",
            "n_dpe",
        ),
        "energy_class": first_value(
            record,
            "etiquette_dpe",
        ),
        "ges_class": first_value(
            record,
            "etiquette_ges",
        ),
        "established_at": first_value(
            record,
            "date_etablissement_dpe",
        ),
        "valid_until": first_value(
            record,
            "date_fin_validite_dpe",
        ),
        "building_type": first_value(
            record,
            "type_batiment",
        ),
        "living_surface_m2": first_value(
            record,
            "surface_habitable_logement",
            "surface_habitable_immeuble",
        ),
        "energy_consumption_kwh_m2_year": first_value(
            record,
            "conso_5_usages_par_m2_ep",
            "conso_5_usages_par_m²_ep",
        ),
        "ges_emissions_kgco2_m2_year": first_value(
            record,
            "emission_ges_5_usages_par_m2",
            "emission_ges_5_usages_par_m²",
        ),
        "matched_address": matched_address,
        "address_match_score": best_score,
    }

    return DataPoint(
        value=value,
        status="available",
        source_type="official",
        source_name="ADEME",
        dataset=ADEME_DATASET_NAME,
        retrieved_at=utc_now(),
        confidence="high",
        verified=True,
        message=(
            "Le DPE correspond au numéro, à la rue, au code postal "
            "et à la commune de l’adresse validée."
        ),
    )
