from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_dict(
    value: Any,
) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def get_answers(
    project: dict[str, Any],
) -> dict[str, Any]:
    return get_dict(project.get("answers"))


def get_snapshot(
    project: dict[str, Any],
) -> dict[str, Any]:
    return get_dict(project.get("snapshot"))


def get_dpe_class(
    snapshot: dict[str, Any],
) -> str | None:
    dpe = get_dict(snapshot.get("dpe"))
    value = get_dict(dpe.get("value"))

    energy_class = value.get("energy_class")

    if isinstance(energy_class, str):
        return energy_class.upper().strip()

    return None


def boolish_missing(value: Any) -> bool:
    return value in {
        None,
        "",
        "unknown",
        "none",
        "old",
        "partial",
        "single",
        "natural",
    }


def build_action(
    *,
    code: str,
    title: str,
    priority: str,
    reason: str,
    verification: str,
    evidence_needed: list[str],
    contractor_questions: list[str],
) -> dict[str, Any]:
    return {
        "code": code,
        "title": title,
        "priority": priority,
        "reason": reason,
        "verification": verification,
        "evidence_needed": evidence_needed,
        "contractor_questions": contractor_questions,
        "pricing_status": "not_priced",
        "savings_status": "not_estimated",
        "subsidy_status": "not_verified",
    }


def generate_renovation_plan(
    project: dict[str, Any],
    evidence_count: int,
) -> dict[str, Any]:
    snapshot = get_snapshot(project)
    answers = get_answers(project)
    dpe_class = get_dpe_class(snapshot)

    actions: list[dict[str, Any]] = []
    missing_information: list[str] = []
    risk_notes: list[str] = []

    property_type = answers.get("property_type")
    roof = answers.get("roof_insulation")
    walls = answers.get("wall_insulation")
    windows = answers.get("windows")
    ventilation = answers.get("ventilation")
    heating = answers.get("heating_system")
    surface = answers.get("living_surface")

    if not property_type:
        missing_information.append("Type de logement")

    if not surface:
        missing_information.append("Surface habitable")

    if not dpe_class:
        missing_information.append("DPE officiel vérifié")

    if boolish_missing(roof):
        actions.append(
            build_action(
                code="roof_or_attic_check",
                title="Vérifier l'isolation toiture ou combles",
                priority="high",
                reason=(
                    "La toiture ou les combles sont souvent une zone "
                    "importante de perte thermique. L'information actuelle "
                    "est absente, ancienne ou partielle."
                ),
                verification=(
                    "Demander une inspection visuelle, épaisseur d'isolant, "
                    "type d'isolant et présence d'humidité."
                ),
                evidence_needed=[
                    "Photo des combles ou de la toiture",
                    "Facture ou ancien devis d'isolation",
                    "Audit énergétique si disponible",
                ],
                contractor_questions=[
                    "Quelle épaisseur d'isolant est déjà présente ?",
                    "Y a-t-il des traces d'humidité ou de ponts thermiques ?",
                    "Quelle solution est compatible avec la ventilation existante ?",
                ],
            )
        )

    if boolish_missing(walls):
        actions.append(
            build_action(
                code="wall_insulation_check",
                title="Contrôler l'isolation des murs",
                priority="medium",
                reason=(
                    "L'isolation des murs n'est pas confirmée. Avant de "
                    "chiffrer des travaux, il faut vérifier la composition "
                    "et l'état des parois."
                ),
                verification=(
                    "Identifier isolation intérieure/extérieure, épaisseur, "
                    "humidité et contraintes de copropriété si appartement."
                ),
                evidence_needed=[
                    "Photos des murs intérieurs ou façade",
                    "Plans ou descriptif technique",
                    "Compte rendu de copropriété si nécessaire",
                ],
                contractor_questions=[
                    "Les murs sont-ils déjà isolés ?",
                    "ITE ou ITI est-elle techniquement possible ?",
                    "Quelles contraintes façade/copropriété existent ?",
                ],
            )
        )

    if windows in {"single", "old_double", "unknown", None, ""}:
        actions.append(
            build_action(
                code="windows_check",
                title="Évaluer les fenêtres et menuiseries",
                priority="medium",
                reason=(
                    "Les fenêtres semblent anciennes ou non confirmées. "
                    "Cela peut affecter le confort, l'étanchéité à l'air "
                    "et le bruit."
                ),
                verification=(
                    "Vérifier type de vitrage, état des joints, ponts "
                    "thermiques et ventilation associée."
                ),
                evidence_needed=[
                    "Photos des fenêtres",
                    "Année de pose si connue",
                    "Devis précédent si disponible",
                ],
                contractor_questions=[
                    "Le vitrage actuel est-il performant ?",
                    "Les joints et entrées d'air sont-ils corrects ?",
                    "Un remplacement est-il prioritaire ou secondaire ?",
                ],
            )
        )

    if ventilation in {"none", "natural", "unknown", None, ""}:
        actions.append(
            build_action(
                code="ventilation_check",
                title="Vérifier la ventilation",
                priority="high",
                reason=(
                    "La ventilation est absente, naturelle ou inconnue. "
                    "Tout projet d'isolation doit éviter les problèmes "
                    "d'humidité et de qualité d'air."
                ),
                verification=(
                    "Identifier la présence d'une VMC, le débit, les entrées "
                    "d'air et les signes d'humidité."
                ),
                evidence_needed=[
                    "Photo des bouches d'aération",
                    "Photo cuisine/salle de bain",
                    "Photo des traces d'humidité si présentes",
                ],
                contractor_questions=[
                    "La ventilation actuelle est-elle suffisante ?",
                    "Faut-il installer ou remplacer une VMC ?",
                    "Y a-t-il un risque d'humidité après isolation ?",
                ],
            )
        )

    if heating in {"oil", "electric", "unknown", None, ""}:
        actions.append(
            build_action(
                code="heating_system_check",
                title="Analyser le système de chauffage",
                priority="medium",
                reason=(
                    "Le chauffage déclaré peut nécessiter une vérification "
                    "avant toute recommandation de remplacement."
                ),
                verification=(
                    "Relever type d'équipement, âge, puissance, entretien "
                    "et compatibilité avec l'isolation prévue."
                ),
                evidence_needed=[
                    "Photo de la chaudière ou radiateurs",
                    "Facture d'entretien",
                    "Facture énergétique annuelle",
                ],
                contractor_questions=[
                    "Quel est l'âge de l'équipement ?",
                    "Le système est-il correctement dimensionné ?",
                    "Un remplacement est-il pertinent après isolation ?",
                ],
            )
        )

    if dpe_class in {"F", "G"}:
        risk_notes.append(
            "Classe DPE F/G : le dossier doit être traité prudemment et vérifié avec des données officielles."
        )

    if dpe_class in {"D", "E", "F", "G"} and not actions:
        actions.append(
            build_action(
                code="technical_visit",
                title="Organiser une visite technique",
                priority="medium",
                reason=(
                    "Les informations disponibles ne suffisent pas pour "
                    "définir un bouquet de travaux fiable."
                ),
                verification=(
                    "Faire contrôler enveloppe, chauffage, ventilation et "
                    "documents existants."
                ),
                evidence_needed=[
                    "DPE",
                    "Photos techniques",
                    "Factures énergie",
                ],
                contractor_questions=[
                    "Quels postes sont réellement prioritaires ?",
                    "Quels travaux sont nécessaires avant devis ?",
                    "Quelles informations manquent pour chiffrer correctement ?",
                ],
            )
        )

    if evidence_count == 0:
        missing_information.append(
            "Photos ou documents justificatifs"
        )

    if not actions:
        actions.append(
            build_action(
                code="complete_file",
                title="Compléter le dossier avant recommandation",
                priority="high",
                reason=(
                    "Le dossier ne contient pas assez d'informations pour "
                    "prioriser les travaux."
                ),
                verification=(
                    "Ajouter DPE, surface, chauffage, isolation, ventilation "
                    "et photos principales."
                ),
                evidence_needed=[
                    "DPE",
                    "Photos façade/fenêtres/chauffage",
                    "Facture énergétique",
                ],
                contractor_questions=[
                    "Quelles données sont nécessaires pour établir un devis fiable ?",
                ],
            )
        )

    priority_order = {
        "high": 0,
        "medium": 1,
        "low": 2,
    }

    actions = sorted(
        actions,
        key=lambda item: priority_order.get(
            item["priority"],
            9,
        ),
    )

    return {
        "status": "generated",
        "generated_at": utc_now_iso(),
        "project_id": project["id"],
        "plan_type": "rule_based_preliminary_action_plan",
        "summary": {
            "actions_count": len(actions),
            "high_priority_count": len(
                [
                    item
                    for item in actions
                    if item["priority"] == "high"
                ]
            ),
            "missing_information_count": len(
                missing_information
            ),
            "evidence_files": evidence_count,
        },
        "actions": actions,
        "missing_information": missing_information,
        "risk_notes": risk_notes,
        "limitations": [
            "Ce plan ne remplace pas un audit énergétique.",
            "Les priorités sont basées sur les informations disponibles.",
            "Aucun coût, gain énergétique ou montant d'aide n'est garanti.",
            "Une visite technique reste nécessaire avant devis.",
        ],
    }
