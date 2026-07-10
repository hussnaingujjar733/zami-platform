from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

TABLE_NAME = "zami_managed_project_leads"


def _to_number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _lead_payload(project: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(project.get("id")),
        "public_reference": project.get("public_reference"),
        "status": project.get("status"),
        "project_type": project.get("project_type"),
        "address": project.get("address"),
        "city": project.get("city"),
        "property_type": project.get("property_type"),
        "surface_m2": _to_number(project.get("surface_m2")),
        "dpe_class": project.get("dpe_class"),
        "urgency": project.get("urgency"),
        "has_quote": bool(project.get("has_quote")),
        "has_artisan": bool(project.get("has_artisan")),
        "budget_range": project.get("budget_range"),
        "description": project.get("description"),
        "contact_name": project.get("contact_name"),
        "contact_email": project.get("contact_email"),
        "contact_phone": project.get("contact_phone"),
        "preferred_contact": project.get("preferred_contact"),
        "source": project.get("source") or "confier_projet",
        "created_at": project.get("created_at") or now,
        "updated_at": project.get("updated_at") or now,
        "raw_payload": project,
    }


def sync_managed_project_lead(project: dict[str, Any]) -> dict[str, Any]:
    url = str(os.getenv("ZAMI_SUPABASE_URL") or "").strip().rstrip("/")
    key = str(os.getenv("ZAMI_SUPABASE_SERVICE_KEY") or "").strip()

    if not url or not key:
        return {"status": "skipped", "note": "Supabase not configured."}

    request = urllib.request.Request(
        f"{url}/rest/v1/{TABLE_NAME}",
        data=json.dumps(_lead_payload(project)).encode("utf-8"),
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return {
                "status": "synced",
                "http_status": response.status,
                "table": TABLE_NAME,
            }
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return {
            "status": "failed",
            "http_status": exc.code,
            "table": TABLE_NAME,
            "error": detail[:500],
        }
    except Exception as exc:
        return {
            "status": "failed",
            "table": TABLE_NAME,
            "error": repr(exc)[:500],
        }
