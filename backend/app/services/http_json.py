from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class ExternalServiceError(RuntimeError):
    pass


def _get_json_sync(
    url: str,
    params: dict[str, Any] | None = None,
    timeout: int = 10,
) -> dict[str, Any]:
    query = urlencode(
        {
            key: value
            for key, value in (params or {}).items()
            if value is not None
        },
        doseq=True,
    )

    request_url = f"{url}?{query}" if query else url

    request = Request(
        request_url,
        headers={
            "Accept": "application/json",
            "User-Agent": "ZAMI/1.0 property-analysis",
        },
    )

    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw)

            if not isinstance(payload, dict):
                raise ExternalServiceError(
                    "Le service externe a renvoyé un format inattendu."
                )

            return payload

    except HTTPError as exc:
        raise ExternalServiceError(
            f"Le service externe a répondu avec le statut {exc.code}."
        ) from exc

    except URLError as exc:
        raise ExternalServiceError(
            "Le service externe est temporairement inaccessible."
        ) from exc

    except TimeoutError as exc:
        raise ExternalServiceError(
            "Le service externe a dépassé le délai de réponse."
        ) from exc

    except json.JSONDecodeError as exc:
        raise ExternalServiceError(
            "Le service externe a renvoyé une réponse illisible."
        ) from exc


async def get_json(
    url: str,
    params: dict[str, Any] | None = None,
    timeout: int = 10,
) -> dict[str, Any]:
    return await asyncio.to_thread(
        _get_json_sync,
        url,
        params,
        timeout,
    )
