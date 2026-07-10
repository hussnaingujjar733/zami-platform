from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


SLACK_OUTBOX_DIR = Path(__file__).resolve().parents[2] / "data" / "slack_outbox"


def _label(value: Any, fallback: str = "Non précisé") -> str:
    if value is None:
        return fallback

    text = str(value).strip()

    return text if text else fallback


def _yes_no(value: Any) -> str:
    return "Oui" if bool(value) else "Non"


def build_managed_project_slack_message(project: dict[str, Any]) -> dict[str, Any]:
    title = "🟢 Nouvelle demande ZAMI — Confier mon projet"

    short_summary = (
        f"*Projet:* {_label(project.get('project_type'))}\n"
        f"*Adresse:* {_label(project.get('address'))} {_label(project.get('city'), '')}\n"
        f"*Urgence:* {_label(project.get('urgency'))}\n"
        f"*Devis déjà reçu:* {_yes_no(project.get('has_quote'))}\n"
        f"*Artisan déjà trouvé:* {_yes_no(project.get('has_artisan'))}"
    )

    contact_summary = (
        f"*Nom:* {_label(project.get('contact_name'))}\n"
        f"*Email:* {_label(project.get('contact_email'))}\n"
        f"*Téléphone:* {_label(project.get('contact_phone'))}\n"
        f"*Préférence:* {_label(project.get('preferred_contact'))}"
    )

    property_summary = (
        f"*Type logement:* {_label(project.get('property_type'))}\n"
        f"*Surface:* {_label(project.get('surface_m2'))} m²\n"
        f"*DPE:* {_label(project.get('dpe_class'))}\n"
        f"*Budget:* {_label(project.get('budget_range'))}"
    )

    description = _label(project.get("description"))

    return {
        "text": title,
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": title,
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*ID projet:*\n{project.get('id')}",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Statut:*\n{project.get('status')}",
                    },
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": short_summary,
                },
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": property_summary,
                    },
                    {
                        "type": "mrkdwn",
                        "text": contact_summary,
                    },
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Description:*\n{description}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Action: préparer le dossier, identifier les documents manquants, puis recontacter le client.",
                    }
                ],
            },
        ],
    }


def save_slack_outbox(project: dict[str, Any], payload: dict[str, Any]) -> Path:
    SLACK_OUTBOX_DIR.mkdir(parents=True, exist_ok=True)

    path = SLACK_OUTBOX_DIR / f"{project['id']}.json"
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return path


def send_managed_project_slack_notification(
    project: dict[str, Any],
) -> dict[str, Any]:
    webhook_url = os.getenv("ZAMI_SLACK_WEBHOOK_URL", "").strip()
    payload = build_managed_project_slack_message(project)
    outbox_path = save_slack_outbox(project, payload)

    if not webhook_url:
        return {
            "status": "slack_outbox_only",
            "outbox_path": str(outbox_path),
            "note": "Slack webhook not configured. Notification saved to Slack outbox.",
        }

    request = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            body = response.read().decode("utf-8", errors="replace")

            if response.status >= 400:
                return {
                    "status": "slack_failed",
                    "outbox_path": str(outbox_path),
                    "note": f"Slack returned HTTP {response.status}: {body}",
                }

    except urllib.error.URLError as error:
        return {
            "status": "slack_failed",
            "outbox_path": str(outbox_path),
            "note": str(error),
        }

    return {
        "status": "slack_sent",
        "outbox_path": str(outbox_path),
        "note": "Slack notification sent successfully.",
    }
