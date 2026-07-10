from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.client_account_store import (
    authenticate_client_account,
    create_client_account,
)
from app.managed_project_store import (
    get_managed_project,
    get_managed_project_by_reference_email,
    rotate_client_access_token,
)

router = APIRouter(prefix="/client-auth", tags=["client-auth"])


class RegisterPayload(BaseModel):
    public_reference: str = Field(..., min_length=4)
    contact_email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)
    full_name: str | None = None


class LoginPayload(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)


@router.post("/register")
def register_client_account(payload: RegisterPayload) -> dict:
    project = get_managed_project_by_reference_email(
        payload.public_reference,
        payload.contact_email,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demande introuvable. Vérifiez le numéro de demande et l’email.",
        )

    account = create_client_account(
        project["id"],
        payload.contact_email,
        payload.password,
        payload.full_name,
    )

    access = rotate_client_access_token(project["id"])

    return {
        "success": True,
        "account": account,
        "project_id": project["id"],
        "public_reference": project.get("public_reference"),
        "client_portal_path": access["client_portal_path"],
    }


@router.post("/login")
def login_client_account(payload: LoginPayload) -> dict:
    account = authenticate_client_account(payload.email, payload.password)

    if account is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    project = get_managed_project(account["managed_project_id"])

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet associé introuvable.",
        )

    access = rotate_client_access_token(project["id"])

    return {
        "success": True,
        "account": account,
        "project_id": project["id"],
        "public_reference": project.get("public_reference"),
        "client_portal_path": access["client_portal_path"],
    }
