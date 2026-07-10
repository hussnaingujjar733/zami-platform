from __future__ import annotations

from typing import Any

from app.managed_document_store import list_managed_documents
from app.managed_project_store import get_managed_project


def label(value: Any, fallback: str = "Non précisé") -> str:
    if value is None:
        return fallback

    text = str(value).strip()
    return text if text else fallback


def project_type_label(value: str | None) -> str:
    labels = {
        "renovation_complete": "rénovation complète",
        "insulation": "isolation",
        "windows": "fenêtres / menuiseries",
        "heating": "chauffage",
        "ventilation": "ventilation",
        "unknown": "projet à clarifier",
    }

    return labels.get(value or "", label(value))


def urgency_label(value: str | None) -> str:
    labels = {
        "this_week": "très urgent",
        "this_month": "à traiter ce mois-ci",
        "three_months": "horizon 3 mois",
        "not_urgent": "pas urgent",
    }

    return labels.get(value or "", label(value))


def build_managed_project_brief(managed_project_id: str) -> dict[str, Any]:
    project = get_managed_project(managed_project_id)

    if project is None:
        raise ValueError("Projet introuvable.")

    documents = list_managed_documents(managed_project_id)
    document_types = {document["document_type"] for document in documents}

    readiness_score = 35

    if project.get("address"):
        readiness_score += 10

    if project.get("description"):
        readiness_score += 12

    if project.get("surface_m2"):
        readiness_score += 8

    if project.get("dpe_class") or "dpe" in document_types:
        readiness_score += 12

    if documents:
        readiness_score += 10

    if project.get("has_quote") or "quote" in document_types:
        readiness_score += 8

    if project.get("contact_email") or project.get("contact_phone"):
        readiness_score += 5

    readiness_score = min(readiness_score, 95)

    missing_documents: list[str] = []

    if not project.get("dpe_class") and "dpe" not in document_types:
        missing_documents.append("DPE ou classe énergétique du logement")

    if "photo" not in document_types:
        missing_documents.append("Photos du logement ou des zones à rénover")

    if project.get("has_quote") and "quote" not in document_types:
        missing_documents.append("Devis reçu par le client")

    if "energy_bill" not in document_types:
        missing_documents.append("Facture énergie récente si disponible")

    if project.get("project_type") == "renovation_complete" and "audit" not in document_types:
        missing_documents.append("Audit énergétique si le projet est global")

    priority_actions = [
        "Confirmer le périmètre exact des travaux avec le client.",
        "Vérifier les documents disponibles et les informations manquantes.",
        "Préparer une demande de devis claire avant de contacter un professionnel.",
    ]

    if project.get("has_quote"):
        priority_actions.insert(
            0,
            "Contrôler le devis reçu avec QuoteGuard avant toute signature.",
        )

    if project.get("urgency") in {"this_week", "this_month"}:
        priority_actions.insert(
            0,
            "Traiter le lead rapidement car le niveau d’urgence est élevé.",
        )

    contractor_questions = [
        "Quels postes de travaux sont inclus et exclus du devis ?",
        "Les qualifications, assurances et garanties sont-elles fournies ?",
        "Le calendrier de chantier est-il réaliste et écrit ?",
        "Les matériaux, marques et performances sont-ils précisés ?",
        "Le prix est-il forfaitaire ou susceptible d’être ajusté ?",
    ]

    if project.get("project_type") == "heating":
        contractor_questions.append(
            "Le nouveau système de chauffage est-il dimensionné selon le logement ?"
        )

    if project.get("project_type") == "windows":
        contractor_questions.append(
            "Les performances Uw / Sw et la pose sont-elles détaillées ?"
        )

    if readiness_score >= 75:
        risk_level = "Projet assez préparé"
    elif readiness_score >= 55:
        risk_level = "Projet partiellement préparé"
    else:
        risk_level = "Projet à clarifier"

    summary = (
        f"Le client souhaite confier un projet de {project_type_label(project.get('project_type'))} "
        f"pour le logement situé à {label(project.get('address'))}. "
        f"L’urgence est: {urgency_label(project.get('urgency'))}. "
        f"Le dossier contient {len(documents)} document(s). "
        f"Le score de préparation est de {readiness_score}/100."
    )

    homeowner_message = (
        f"Bonjour {label(project.get('contact_name'), 'Madame, Monsieur')},\n\n"
        "Votre demande ZAMI a bien été reçue. "
        "Nous allons préparer un dossier clair pour identifier les points à vérifier, "
        "les documents manquants et les prochaines étapes avant de contacter ou comparer des professionnels.\n\n"
        "Pour accélérer l’analyse, vous pouvez ajouter si possible: DPE, photos du logement, devis reçu, "
        "facture énergie ou audit énergétique.\n\n"
        "L’équipe ZAMI"
    )

    return {
        "readiness_score": readiness_score,
        "risk_level": risk_level,
        "summary": summary,
        "missing_documents": missing_documents,
        "priority_actions": priority_actions,
        "contractor_questions": contractor_questions,
        "homeowner_message": homeowner_message,
        "metadata": {
            "document_count": len(documents),
            "document_types": sorted(document_types),
            "has_quote": bool(project.get("has_quote")),
            "has_artisan": bool(project.get("has_artisan")),
        },
    }
