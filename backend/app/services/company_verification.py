from __future__ import annotations

import json
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_BASE_URL = "https://recherche-entreprises.api.gouv.fr/search"


def digits_only(value: str | None) -> str | None:
    if not value:
        return None

    cleaned = re.sub(r"\D", "", value)

    return cleaned or None


def get_nested(
    data: dict[str, Any],
    path: list[str],
) -> Any:
    current: Any = data

    for key in path:
        if not isinstance(current, dict):
            return None

        current = current.get(key)

    return current


def first_value(
    data: dict[str, Any],
    paths: list[list[str]],
) -> Any:
    for path in paths:
        value = get_nested(data, path)

        if value not in (None, ""):
            return value

    return None


def normalize_status(value: Any) -> tuple[bool | None, str | None]:
    if value is None:
        return None, None

    raw = str(value).strip()
    lowered = raw.lower()

    if raw == "A" or lowered in {"actif", "active", "en activité"}:
        return True, raw

    if raw == "F" or lowered in {"fermé", "fermee", "cessé", "inactive"}:
        return False, raw

    return None, raw


def build_address(result: dict[str, Any]) -> str | None:
    siege = result.get("siege")

    if not isinstance(siege, dict):
        return None

    parts = [
        siege.get("numero_voie"),
        siege.get("type_voie"),
        siege.get("libelle_voie"),
        siege.get("code_postal"),
        siege.get("libelle_commune"),
    ]

    clean_parts = [
        str(part).strip()
        for part in parts
        if part not in (None, "")
    ]

    if not clean_parts:
        return None

    return " ".join(clean_parts)


def extract_official_result(
    result: dict[str, Any],
    queried_identifier: str,
) -> dict[str, Any]:
    official_siren = digits_only(
        first_value(
            result,
            [
                ["siren"],
                ["unite_legale", "siren"],
            ],
        )
    )

    official_siret = digits_only(
        first_value(
            result,
            [
                ["siret"],
                ["siege", "siret"],
                ["etablissement", "siret"],
            ],
        )
    )

    matching_establishments = result.get("matching_etablissements")

    if not official_siret and isinstance(matching_establishments, list):
        for item in matching_establishments:
            if not isinstance(item, dict):
                continue

            candidate = digits_only(item.get("siret"))

            if candidate:
                official_siret = candidate
                break

    official_name = first_value(
        result,
        [
            ["nom_raison_sociale"],
            ["nom_complet"],
            ["denomination"],
            ["unite_legale", "denomination"],
            ["unite_legale", "nom_raison_sociale"],
        ],
    )

    naf_code = first_value(
        result,
        [
            ["activite_principale"],
            ["activite_principale_unite_legale"],
            ["siege", "activite_principale"],
        ],
    )

    status_value = first_value(
        result,
        [
            ["etat_administratif"],
            ["etat_administratif_unite_legale"],
            ["siege", "etat_administratif"],
        ],
    )

    active, raw_status = normalize_status(status_value)

    queried_matches = (
        queried_identifier == official_siren
        or queried_identifier == official_siret
        or (
            official_siret is not None
            and queried_identifier == official_siret[:9]
        )
    )

    verification_status = "verified" if queried_matches else "possible_match"

    return {
        "provider": "API Recherche d'entreprises",
        "status": verification_status,
        "queried_identifier": queried_identifier,
        "official_name": official_name,
        "siren": official_siren,
        "siret": official_siret,
        "active": active,
        "raw_administrative_status": raw_status,
        "naf_code": naf_code,
        "address": build_address(result),
        "matching_identifier": queried_matches,
        "notes": [
            "Entreprise trouvée dans une source officielle française.",
            "La qualification RGE et l'assurance décennale doivent être vérifiées séparément.",
        ],
    }


def verify_company_identifier(
    siren: str | None = None,
    siret: str | None = None,
) -> dict[str, Any]:
    cleaned_siret = digits_only(siret)
    cleaned_siren = digits_only(siren)

    queried_identifier = cleaned_siret or cleaned_siren

    if not queried_identifier:
        return {
            "provider": "API Recherche d'entreprises",
            "status": "not_checked",
            "queried_identifier": None,
            "official_name": None,
            "siren": None,
            "siret": None,
            "active": None,
            "raw_administrative_status": None,
            "naf_code": None,
            "address": None,
            "matching_identifier": False,
            "notes": ["Aucun SIREN/SIRET détecté dans le devis."],
        }

    params = urlencode(
        {
            "q": queried_identifier,
            "page": 1,
            "per_page": 1,
        }
    )

    url = f"{API_BASE_URL}?{params}"

    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "ZAMI-QuoteGuard/0.1",
        },
    )

    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        return {
            "provider": "API Recherche d'entreprises",
            "status": "unavailable",
            "queried_identifier": queried_identifier,
            "official_name": None,
            "siren": cleaned_siren,
            "siret": cleaned_siret,
            "active": None,
            "raw_administrative_status": None,
            "naf_code": None,
            "address": None,
            "matching_identifier": False,
            "notes": [f"API officielle indisponible HTTP {error.code}."],
        }
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        return {
            "provider": "API Recherche d'entreprises",
            "status": "unavailable",
            "queried_identifier": queried_identifier,
            "official_name": None,
            "siren": cleaned_siren,
            "siret": cleaned_siret,
            "active": None,
            "raw_administrative_status": None,
            "naf_code": None,
            "address": None,
            "matching_identifier": False,
            "notes": [f"Vérification officielle impossible: {error}"],
        }

    results = payload.get("results")

    if not isinstance(results, list) or not results:
        return {
            "provider": "API Recherche d'entreprises",
            "status": "not_found",
            "queried_identifier": queried_identifier,
            "official_name": None,
            "siren": cleaned_siren,
            "siret": cleaned_siret,
            "active": None,
            "raw_administrative_status": None,
            "naf_code": None,
            "address": None,
            "matching_identifier": False,
            "notes": [
                "Aucune entreprise trouvée pour cet identifiant.",
                "Vérifier que le SIREN/SIRET a été correctement lu dans le devis.",
            ],
        }

    return extract_official_result(
        results[0],
        queried_identifier,
    )
