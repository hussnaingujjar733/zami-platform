from __future__ import annotations

from typing import Any

from app.services.http_json import ExternalServiceError, get_json


GEOCODING_URL = "https://data.geopf.fr/geocodage/search"


class AddressNotFoundError(LookupError):
    pass


def parse_feature(feature: Any) -> dict[str, Any] | None:
    if not isinstance(feature, dict):
        return None

    properties = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    coordinates = geometry.get("coordinates") or []

    if (
        not isinstance(properties, dict)
        or not properties.get("label")
        or not isinstance(coordinates, list)
        or len(coordinates) < 2
    ):
        return None

    return {
        "id": properties.get("id") or properties.get("label"),
        "label": properties.get("label"),
        "name": properties.get("name") or properties.get("label"),
        "score": float(properties.get("score") or 0),
        "housenumber": properties.get("housenumber"),
        "street": properties.get("street"),
        "postcode": properties.get("postcode"),
        "citycode": properties.get("citycode"),
        "city": properties.get("city"),
        "district": properties.get("district"),
        "context": properties.get("context"),
        "type": properties.get("type"),
        "longitude": float(coordinates[0]),
        "latitude": float(coordinates[1]),
    }


async def suggest_french_addresses(
    query: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    payload = await get_json(
        GEOCODING_URL,
        {
            "q": query.strip(),
            "index": "address",
            "limit": max(1, min(limit, 5)),
            "autocomplete": 1,
        },
        timeout=8,
    )

    features = payload.get("features")

    if not isinstance(features, list):
        return []

    suggestions: list[dict[str, Any]] = []
    seen: set[str] = set()

    for feature in features:
        suggestion = parse_feature(feature)

        if not suggestion:
            continue

        # ZAMI requires an exact building/house number.
        # Street-only or municipality-only results are not selectable.
        is_precise = bool(
            suggestion.get("housenumber")
            and suggestion.get("street")
            and suggestion.get("postcode")
            and suggestion.get("citycode")
        )

        if not is_precise:
            continue

        identity = str(
            suggestion.get("id") or suggestion.get("label")
        )

        if identity in seen:
            continue

        seen.add(identity)
        suggestions.append(suggestion)

    return suggestions[:limit]


async def geocode_french_address(address: str) -> dict[str, Any]:
    payload = await get_json(
        GEOCODING_URL,
        {
            "q": address.strip(),
            "index": "address",
            "limit": 1,
            "autocomplete": 0,
        },
        timeout=10,
    )

    features = payload.get("features")

    if not isinstance(features, list) or not features:
        raise AddressNotFoundError(
            "Aucune adresse française suffisamment précise n’a été trouvée."
        )

    result = parse_feature(features[0])

    if not result:
        raise AddressNotFoundError(
            "Le service officiel a renvoyé une adresse incomplète."
        )

    return result


__all__ = [
    "AddressNotFoundError",
    "ExternalServiceError",
    "geocode_french_address",
    "suggest_french_addresses",
]
