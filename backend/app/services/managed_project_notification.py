from __future__ import annotations

import json
import os
import smtplib
import urllib.error
import urllib.request
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



def send_with_resend_api(
    subject: str,
    body: str,
    outbox_path: Path,
) -> dict[str, Any] | None:
    api_key = str(os.getenv("ZAMI_RESEND_API_KEY") or os.getenv("RESEND_API_KEY") or "").strip()

    if not api_key:
        return None

    sender = (
        os.getenv("ZAMI_RESEND_FROM")
        or os.getenv("ZAMI_EMAIL_FROM")
        or "ZAMI <onboarding@resend.dev>"
    )

    payload = {
        "from": sender,
        "to": [ADMIN_EMAIL],
        "subject": subject,
        "text": body,
    }

    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "zami-platform/0.2.0",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            return {
                "status": "sent",
                "provider": "resend",
                "admin_email": ADMIN_EMAIL,
                "outbox_path": str(outbox_path),
                "http_status": response.status,
                "note": "Email sent successfully with Resend.",
                "provider_response": response_body[:300],
            }
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return {
            "status": "resend_failed",
            "provider": "resend",
            "admin_email": ADMIN_EMAIL,
            "outbox_path": str(outbox_path),
            "http_status": exc.code,
            "note": "Resend email sending failed.",
            "error": detail[:500],
        }
    except Exception as exc:
        return {
            "status": "resend_failed",
            "provider": "resend",
            "admin_email": ADMIN_EMAIL,
            "outbox_path": str(outbox_path),
            "note": "Resend email sending failed.",
            "error": repr(exc)[:500],
        }

def send_admin_notification(project: dict[str, Any]) -> dict[str, Any]:
    subject, body = build_managed_project_email(project)
    outbox_path = save_to_outbox(project, subject, body)

    resend_result = send_with_resend_api(subject, body, outbox_path)
    if resend_result and resend_result.get("status") == "sent":
        return resend_result

    smtp_host = os.getenv("ZAMI_SMTP_HOST")
    smtp_port = int(os.getenv("ZAMI_SMTP_PORT", "587"))
    smtp_user = os.getenv("ZAMI_SMTP_USER")
    smtp_password = os.getenv("ZAMI_SMTP_PASSWORD")
    sender = os.getenv("ZAMI_EMAIL_FROM", smtp_user or ADMIN_EMAIL)

    if not smtp_host or not smtp_user or not smtp_password:
        return {
            "status": "failed_outbox_only" if resend_result else "outbox_only",
            "admin_email": ADMIN_EMAIL,
            "outbox_path": str(outbox_path),
            "note": "Email provider not configured or failed. Notification saved to outbox.",
            "resend_result": resend_result,
        }

    message = EmailMessage()
    message["From"] = sender
    message["To"] = ADMIN_EMAIL
    message["Subject"] = subject
    message.set_content(body)

    try:
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
    except Exception as exc:
        return {
            "status": "failed_outbox_only",
            "admin_email": ADMIN_EMAIL,
            "outbox_path": str(outbox_path),
            "note": "Email sending failed. Request was still saved and can be synced.",
            "error": repr(exc)[:300],
        }
