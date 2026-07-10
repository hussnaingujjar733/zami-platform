from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any


OUTBOX_DIR = Path(__file__).resolve().parents[2] / "data" / "email_outbox"
ADMIN_EMAIL = os.getenv("ZAMI_ADMIN_EMAIL", "thezamifrance@gmail.com")


def build_managed_project_email(project: dict[str, Any]) -> tuple[str, str]:
    subject = f"Nouvelle demande ZAMI - {project.get('project_type')}"

    body = f"""
Nouvelle demande Confier mon projet

ID projet:
{project.get("id")}

Statut:
{project.get("status")}

Type de projet:
{project.get("project_type")}

Adresse:
{project.get("address")}
{project.get("city") or ""}

Logement:
Type: {project.get("property_type") or "Non précisé"}
Surface: {project.get("surface_m2") or "Non précisée"}
DPE: {project.get("dpe_class") or "Non précisé"}

Situation:
Urgence: {project.get("urgency") or "Non précisée"}
A déjà un devis: {"Oui" if project.get("has_quote") else "Non"}
A déjà un artisan: {"Oui" if project.get("has_artisan") else "Non"}
Budget: {project.get("budget_range") or "Non précisé"}

Description:
{project.get("description") or "Non précisée"}

Contact:
Nom: {project.get("contact_name")}
Email: {project.get("contact_email")}
Téléphone: {project.get("contact_phone") or "Non précisé"}
Préférence: {project.get("preferred_contact") or "Non précisée"}

Source:
{project.get("source")}


Action:
Préparer le dossier, identifier les documents manquants et recontacter le client.
""".strip()

    return subject, body


def save_to_outbox(
    project: dict[str, Any],
    subject: str,
    body: str,
) -> Path:
    OUTBOX_DIR.mkdir(parents=True, exist_ok=True)

    path = OUTBOX_DIR / f"{project['id']}.txt"

    path.write_text(
        f"TO: {ADMIN_EMAIL}\nSUBJECT: {subject}\n\n{body}\n",
        encoding="utf-8",
    )

    return path


def send_admin_notification(project: dict[str, Any]) -> dict[str, Any]:
    subject, body = build_managed_project_email(project)
    outbox_path = save_to_outbox(project, subject, body)

    smtp_host = os.getenv("ZAMI_SMTP_HOST")
    smtp_port = int(os.getenv("ZAMI_SMTP_PORT", "587"))
    smtp_user = os.getenv("ZAMI_SMTP_USER")
    smtp_password = os.getenv("ZAMI_SMTP_PASSWORD")
    sender = os.getenv("ZAMI_EMAIL_FROM", smtp_user or ADMIN_EMAIL)

    if not smtp_host or not smtp_user or not smtp_password:
        return {
            "status": "outbox_only",
            "admin_email": ADMIN_EMAIL,
            "outbox_path": str(outbox_path),
            "note": "SMTP not configured. Notification saved to outbox.",
        }

    message = EmailMessage()
    message["From"] = sender
    message["To"] = ADMIN_EMAIL
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(message)

    return {
        "status": "sent",
        "admin_email": ADMIN_EMAIL,
        "outbox_path": str(outbox_path),
        "note": "Email sent successfully.",
    }
