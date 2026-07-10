from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database import database_connection
from app.managed_project_store import get_managed_project, public_project_view, verify_client_access

router = APIRouter(prefix="/client-projects", tags=["client-offer"])


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OfferDecisionPayload(BaseModel):
    decision: str = Field(..., min_length=3)


@router.post("/{project_id}/offer-decision")
def decide_zami_offer(
    project_id: str,
    payload: OfferDecisionPayload,
    token: str = Query(..., min_length=20),
) -> dict:
    project = verify_client_access(project_id, token)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lien de suivi invalide ou expiré.",
        )

    decision = payload.decision.strip().lower()

    if decision not in {"accepted", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Décision invalide.",
        )

    current_offer_status = str(project.get("zami_offer_status") or "").strip()

    if current_offer_status not in {"sent", "accepted", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune offre ZAMI active à valider.",
        )

    now = utc_now_iso()

    with database_connection() as connection:
        connection.execute(
            """
            UPDATE managed_projects
            SET zami_offer_status = ?,
                zami_offer_decision_at = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                decision,
                now,
                "offer_accepted" if decision == "accepted" else "offer_rejected",
                now,
                project_id,
            ),
        )

    updated_project = get_managed_project(project_id)

    return {
        "success": True,
        "decision": decision,
        "project": public_project_view(updated_project) if updated_project else None,
    }
