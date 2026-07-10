from __future__ import annotations

import json
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


GREEN = colors.HexColor("#168A4A")
DARK_GREEN = colors.HexColor("#0F6436")
LIGHT_GREEN = colors.HexColor("#EAF7EF")
VERY_LIGHT_GREEN = colors.HexColor("#F5FAF7")
TEXT = colors.HexColor("#202823")
MUTED = colors.HexColor("#68736B")
BORDER = colors.HexColor("#D9E5DC")
WARNING = colors.HexColor("#A96F13")
LIGHT_WARNING = colors.HexColor("#FDF6E8")


def register_fonts() -> tuple[str, str]:
    regular_path = Path(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    )
    bold_path = Path(
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    )

    if regular_path.exists() and bold_path.exists():
        try:
            pdfmetrics.registerFont(
                TTFont("ZamiRegular", str(regular_path))
            )
            pdfmetrics.registerFont(
                TTFont("ZamiBold", str(bold_path))
            )

            return "ZamiRegular", "ZamiBold"
        except Exception:
            pass

    return "Helvetica", "Helvetica-Bold"


FONT_REGULAR, FONT_BOLD = register_fonts()


ANSWER_LABELS = {
    "has_dpe_document": "Document énergétique disponible",
    "property_type": "Type de logement",
    "apartment_floor": "Position dans l'immeuble",
    "living_surface": "Surface habitable",
    "construction_period": "Période de construction",
    "heating_system": "Chauffage principal",
    "roof_insulation": "Isolation toiture",
    "wall_insulation": "Isolation murs",
    "windows": "Fenêtres",
    "ventilation": "Ventilation",
    "annual_energy_bill": "Facture énergétique annuelle",
    "primary_objective": "Objectif principal",
}


VALUE_LABELS = {
    "house": "Maison individuelle",
    "apartment": "Appartement",
    "ground": "Rez-de-chaussée",
    "middle": "Étage intermédiaire",
    "top": "Dernier étage",
    "gas": "Chaudière gaz",
    "electric": "Chauffage électrique",
    "heat_pump": "Pompe à chaleur",
    "oil": "Fioul",
    "wood": "Bois ou granulés",
    "district": "Chauffage collectif ou réseau",
    "single": "Simple vitrage",
    "old_double": "Double vitrage ancien",
    "recent_double": "Double vitrage récent",
    "triple": "Triple vitrage",
    "mixed": "Plusieurs types",
    "natural": "Ventilation naturelle",
    "single_flow": "VMC simple flux",
    "double_flow": "VMC double flux",
    "none": "Absent ou inconnu",
    "good": "Récent ou en bon état",
    "old": "Ancien",
    "partial": "Partiel ou ancien",
    "comfort": "Améliorer le confort",
    "bills": "Réduire les factures",
    "dpe": "Améliorer le DPE",
    "sell": "Préparer une vente ou location",
    "complete_project": "Rénovation globale",
    "quote_check": "Vérifier un devis",
    "unknown": "Information inconnue",
    "yes": "Oui",
    "no": "Non",
}


EVIDENCE_LABELS = {
    "dpe": "DPE",
    "energy_audit": "Audit énergétique",
    "energy_bill": "Facture énergétique",
    "quote": "Devis",
    "facade": "Photo de la façade",
    "windows": "Photo des fenêtres",
    "roof_attic": "Photo toiture ou combles",
    "heating_system": "Photo du chauffage",
    "humidity": "Photo d'humidité",
    "other_photo": "Autre photographie",
}


STATUS_LABELS = {
    "draft": "Brouillon",
    "questionnaire": "Questionnaire",
    "documents": "Documents",
    "report_ready": "Rapport prêt",
    "archived": "Archivé",
}


def safe_text(value: Any, fallback: str = "Non renseigné") -> str:
    if value is None or value == "":
        return fallback

    if isinstance(value, (dict, list)):
        return json.dumps(
            value,
            ensure_ascii=False,
            separators=(", ", ": "),
        )

    return str(value)


def paragraph(
    value: Any,
    style: ParagraphStyle,
    fallback: str = "Non renseigné",
) -> Paragraph:
    return Paragraph(
        escape(safe_text(value, fallback)),
        style,
    )


def format_iso_date(value: Any) -> str:
    if not value:
        return "Non renseignée"

    try:
        parsed = datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )

        return parsed.astimezone(timezone.utc).strftime(
            "%d/%m/%Y à %H:%M UTC"
        )
    except (TypeError, ValueError):
        return safe_text(value)


def format_answer(key: str, value: Any) -> str:
    if key == "living_surface":
        return f"{safe_text(value)} m²"

    if key == "annual_energy_bill":
        return f"{safe_text(value)} € / an"

    return VALUE_LABELS.get(str(value), safe_text(value))


def format_size(size_bytes: Any) -> str:
    try:
        size = int(size_bytes)
    except (TypeError, ValueError):
        return "Taille inconnue"

    if size < 1024 * 1024:
        return f"{max(1, round(size / 1024))} Ko"

    return f"{size / (1024 * 1024):.1f} Mo"


def get_snapshot_data(project: dict[str, Any]) -> dict[str, Any]:
    snapshot = project.get("snapshot")

    return snapshot if isinstance(snapshot, dict) else {}


def get_data_point_value(
    snapshot: dict[str, Any],
    key: str,
) -> dict[str, Any]:
    data_point = snapshot.get(key)

    if not isinstance(data_point, dict):
        return {}

    value = data_point.get("value")

    return value if isinstance(value, dict) else {}


def is_verified(
    snapshot: dict[str, Any],
    key: str,
) -> bool:
    data_point = snapshot.get(key)

    if not isinstance(data_point, dict):
        return False

    return data_point.get("verified") is True


def page_footer(canvas, document) -> None:
    canvas.saveState()

    width, _ = A4

    canvas.setStrokeColor(BORDER)
    canvas.line(
        document.leftMargin,
        13 * mm,
        width - document.rightMargin,
        13 * mm,
    )

    canvas.setFont(FONT_REGULAR, 7)
    canvas.setFillColor(MUTED)

    canvas.drawString(
        document.leftMargin,
        8 * mm,
        "ZAMI · Rapport préliminaire de préparation",
    )

    canvas.drawRightString(
        width - document.rightMargin,
        8 * mm,
        f"Page {document.page}",
    )

    canvas.restoreState()


def generate_project_pdf(
    project: dict[str, Any],
    evidence: list[dict[str, Any]],
    analysis_record: dict[str, Any] | None = None,
    renovation_plan_record: dict[str, Any] | None = None,
    quote_check_record: dict[str, Any] | None = None,
) -> bytes:
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=17 * mm,
        bottomMargin=20 * mm,
        title=f"ZAMI Rapport {project.get('id', '')}",
        author="ZAMI",
        subject="Rapport préliminaire de rénovation énergétique",
    )

    title_style = ParagraphStyle(
        "ZamiTitle",
        fontName=FONT_BOLD,
        fontSize=24,
        leading=28,
        textColor=DARK_GREEN,
        alignment=TA_LEFT,
        spaceAfter=5 * mm,
    )

    subtitle_style = ParagraphStyle(
        "ZamiSubtitle",
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=14,
        textColor=MUTED,
        spaceAfter=5 * mm,
    )

    heading_style = ParagraphStyle(
        "ZamiHeading",
        fontName=FONT_BOLD,
        fontSize=14,
        leading=18,
        textColor=DARK_GREEN,
        spaceBefore=5 * mm,
        spaceAfter=3 * mm,
    )

    body_style = ParagraphStyle(
        "ZamiBody",
        fontName=FONT_REGULAR,
        fontSize=8.5,
        leading=13,
        textColor=TEXT,
    )

    small_style = ParagraphStyle(
        "ZamiSmall",
        fontName=FONT_REGULAR,
        fontSize=7.5,
        leading=11,
        textColor=MUTED,
    )

    table_header_style = ParagraphStyle(
        "ZamiTableHeader",
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
    )

    table_label_style = ParagraphStyle(
        "ZamiTableLabel",
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=11,
        textColor=TEXT,
    )

    snapshot = get_snapshot_data(project)
    address_value = get_data_point_value(snapshot, "address")
    dpe_value = get_data_point_value(snapshot, "dpe")

    address_label = (
        project.get("address_label")
        or address_value.get("label")
        or "Adresse non renseignée"
    )

    energy_class = dpe_value.get("energy_class")
    ges_class = (
        dpe_value.get("ges_class")
        or dpe_value.get("ghg_class")
    )

    answers = project.get("answers")

    if not isinstance(answers, dict):
        answers = {}

    report = project.get("report")

    if not isinstance(report, dict):
        report = {}

    analysis_data: dict[str, Any] = {}

    if isinstance(analysis_record, dict):
        candidate = analysis_record.get("analysis")

        if isinstance(candidate, dict):
            analysis_data = candidate

    renovation_plan_data: dict[str, Any] = {}

    if isinstance(renovation_plan_record, dict):
        candidate = renovation_plan_record.get("plan")

        if isinstance(candidate, dict):
            renovation_plan_data = candidate

    quote_check_data: dict[str, Any] = {}

    if isinstance(quote_check_record, dict):
        candidate = quote_check_record.get("quote_check")

        if isinstance(candidate, dict):
            quote_check_data = candidate

    story: list[Any] = []

    story.append(
        Table(
            [
                [
                    paragraph("ZAMI", title_style),
                    paragraph(
                        "Rénovation énergétique · France",
                        subtitle_style,
                    ),
                ]
            ],
            colWidths=[80 * mm, 95 * mm],
        )
    )

    story.append(
        Paragraph(
            "Rapport préliminaire de préparation",
            title_style,
        )
    )

    story.append(
        Paragraph(
            (
                "Synthèse des données officielles disponibles, "
                "des déclarations du propriétaire et des fichiers "
                "ajoutés au dossier."
            ),
            subtitle_style,
        )
    )

    identity_rows = [
        [
            paragraph("Adresse", table_label_style),
            paragraph(address_label, body_style),
        ],
        [
            paragraph("Identifiant du projet", table_label_style),
            paragraph(project.get("id"), body_style),
        ],
        [
            paragraph("Statut", table_label_style),
            paragraph(
                STATUS_LABELS.get(
                    str(project.get("status")),
                    safe_text(project.get("status")),
                ),
                body_style,
            ),
        ],
        [
            paragraph("Créé le", table_label_style),
            paragraph(
                format_iso_date(project.get("created_at")),
                body_style,
            ),
        ],
        [
            paragraph("Rapport généré le", table_label_style),
            paragraph(
                datetime.now(timezone.utc).strftime(
                    "%d/%m/%Y à %H:%M UTC"
                ),
                body_style,
            ),
        ],
    ]

    identity_table = Table(
        identity_rows,
        colWidths=[48 * mm, 127 * mm],
    )

    identity_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), LIGHT_GREEN),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    story.append(identity_table)
    story.append(Spacer(1, 5 * mm))

    story.append(
        Paragraph("État des données", heading_style)
    )

    data_status_rows = [
        [
            paragraph("Donnée", table_header_style),
            paragraph("État", table_header_style),
            paragraph("Source ou limite", table_header_style),
        ],
        [
            paragraph("Adresse", table_label_style),
            paragraph(
                "Vérifiée"
                if is_verified(snapshot, "address")
                else "À confirmer",
                body_style,
            ),
            paragraph(
                "Base Adresse Nationale"
                if is_verified(snapshot, "address")
                else "Association officielle non confirmée",
                small_style,
            ),
        ],
        [
            paragraph("DPE", table_label_style),
            paragraph(
                f"Classe {energy_class}"
                if energy_class and is_verified(snapshot, "dpe")
                else "Non confirmé",
                body_style,
            ),
            paragraph(
                "DPE strictement associé au logement"
                if energy_class and is_verified(snapshot, "dpe")
                else "Aucune classe énergétique n'est déduite",
                small_style,
            ),
        ],
        [
            paragraph("Questionnaire", table_label_style),
            paragraph(
                f"{len(answers)} réponses",
                body_style,
            ),
            paragraph(
                "Déclarations du propriétaire",
                small_style,
            ),
        ],
        [
            paragraph("Documents et photos", table_label_style),
            paragraph(
                f"{len(evidence)} fichier(s)",
                body_style,
            ),
            paragraph(
                "Fichiers reçus · analyse technique en attente",
                small_style,
            ),
        ],
    ]

    status_table = Table(
        data_status_rows,
        colWidths=[42 * mm, 45 * mm, 88 * mm],
        repeatRows=1,
    )

    status_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                    colors.white,
                    VERY_LIGHT_GREEN,
                ]),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    story.append(status_table)

    if energy_class or ges_class:
        story.append(
            Paragraph(
                "Informations énergétiques disponibles",
                heading_style,
            )
        )

        dpe_rows = [
            [
                paragraph("Indicateur", table_header_style),
                paragraph("Valeur", table_header_style),
                paragraph("Statut", table_header_style),
            ],
            [
                paragraph("Classe énergie", table_label_style),
                paragraph(energy_class, body_style),
                paragraph(
                    "Vérifiée"
                    if is_verified(snapshot, "dpe")
                    else "Non vérifiée",
                    small_style,
                ),
            ],
            [
                paragraph("Classe GES", table_label_style),
                paragraph(ges_class, body_style),
                paragraph(
                    "Vérifiée"
                    if is_verified(snapshot, "dpe")
                    else "Non vérifiée",
                    small_style,
                ),
            ],
            [
                paragraph("Surface DPE", table_label_style),
                paragraph(
                    (
                        f"{dpe_value.get('living_surface_m2')} m²"
                        if dpe_value.get("living_surface_m2")
                        else None
                    ),
                    body_style,
                ),
                paragraph(
                    "Source DPE disponible",
                    small_style,
                ),
            ],
            [
                paragraph("Numéro DPE", table_label_style),
                paragraph(
                    dpe_value.get("dpe_number"),
                    body_style,
                ),
                paragraph(
                    "Identifiant officiel lorsqu'il est disponible",
                    small_style,
                ),
            ],
        ]

        dpe_table = Table(
            dpe_rows,
            colWidths=[55 * mm, 55 * mm, 65 * mm],
            repeatRows=1,
        )

        dpe_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(dpe_table)

    story.append(
        Paragraph("Profil déclaré du logement", heading_style)
    )

    if answers:
        answer_rows = [
            [
                paragraph("Information", table_header_style),
                paragraph("Réponse", table_header_style),
                paragraph("Type de source", table_header_style),
            ]
        ]

        for key, value in answers.items():
            if value in ("", None):
                continue

            answer_rows.append(
                [
                    paragraph(
                        ANSWER_LABELS.get(key, key),
                        table_label_style,
                    ),
                    paragraph(
                        format_answer(key, value),
                        body_style,
                    ),
                    paragraph(
                        "Déclaration propriétaire",
                        small_style,
                    ),
                ]
            )

        answer_table = Table(
            answer_rows,
            colWidths=[65 * mm, 65 * mm, 45 * mm],
            repeatRows=1,
        )

        answer_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                        colors.white,
                        VERY_LIGHT_GREEN,
                    ]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(answer_table)
    else:
        story.append(
            Paragraph(
                "Le questionnaire propriétaire n'a pas encore été complété.",
                body_style,
            )
        )

    if analysis_data:
        estimate = analysis_data.get("estimate")
        inputs = analysis_data.get("inputs")
        model = analysis_data.get("model")
        warnings = analysis_data.get("warnings")

        if not isinstance(estimate, dict):
            estimate = {}

        if not isinstance(inputs, dict):
            inputs = {}

        if not isinstance(model, dict):
            model = {}

        central_cost = estimate.get(
            "central_cost_eur"
        )

        if isinstance(central_cost, (int, float)):
            formatted_cost = (
                f"{int(central_cost):,}"
                .replace(",", " ")
                + " €"
            )

            story.append(
                Paragraph(
                    "Estimation expérimentale des travaux",
                    heading_style,
                )
            )

            analysis_rows = [
                [
                    paragraph(
                        "Indicateur",
                        table_header_style,
                    ),
                    paragraph(
                        "Valeur",
                        table_header_style,
                    ),
                    paragraph(
                        "Source ou limite",
                        table_header_style,
                    ),
                ],
                [
                    paragraph(
                        "Coût central indicatif",
                        table_label_style,
                    ),
                    paragraph(
                        formatted_cost,
                        body_style,
                    ),
                    paragraph(
                        "Sortie expérimentale du modèle · pas un devis",
                        small_style,
                    ),
                ],
                [
                    paragraph(
                        "Surface utilisée",
                        table_label_style,
                    ),
                    paragraph(
                        (
                            f"{inputs.get('surface_m2')} m²"
                            if inputs.get("surface_m2")
                            is not None
                            else None
                        ),
                        body_style,
                    ),
                    paragraph(
                        (
                            "DPE vérifié"
                            if inputs.get(
                                "surface_source"
                            )
                            == "verified_dpe"
                            else "Déclaration propriétaire"
                        ),
                        small_style,
                    ),
                ],
                [
                    paragraph(
                        "Classe DPE",
                        table_label_style,
                    ),
                    paragraph(
                        inputs.get(
                            "verified_dpe_class"
                        ),
                        body_style,
                    ),
                    paragraph(
                        "Classe officielle vérifiée",
                        small_style,
                    ),
                ],
                [
                    paragraph(
                        "Confiance",
                        table_label_style,
                    ),
                    paragraph(
                        analysis_data.get(
                            "confidence"
                        ),
                        body_style,
                    ),
                    paragraph(
                        "Aucun intervalle statistique validé",
                        small_style,
                    ),
                ],
                [
                    paragraph(
                        "Version du modèle",
                        table_label_style,
                    ),
                    paragraph(
                        model.get("version"),
                        body_style,
                    ),
                    paragraph(
                        "Statut expérimental",
                        small_style,
                    ),
                ],
            ]

            analysis_table = Table(
                analysis_rows,
                colWidths=[
                    52 * mm,
                    48 * mm,
                    75 * mm,
                ],
                repeatRows=1,
            )

            analysis_table.setStyle(
                TableStyle(
                    [
                        (
                            "BACKGROUND",
                            (0, 0),
                            (-1, 0),
                            GREEN,
                        ),
                        (
                            "GRID",
                            (0, 0),
                            (-1, -1),
                            0.5,
                            BORDER,
                        ),
                        (
                            "VALIGN",
                            (0, 0),
                            (-1, -1),
                            "TOP",
                        ),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [
                                colors.white,
                                VERY_LIGHT_GREEN,
                            ],
                        ),
                        (
                            "LEFTPADDING",
                            (0, 0),
                            (-1, -1),
                            7,
                        ),
                        (
                            "RIGHTPADDING",
                            (0, 0),
                            (-1, -1),
                            7,
                        ),
                        (
                            "TOPPADDING",
                            (0, 0),
                            (-1, -1),
                            7,
                        ),
                        (
                            "BOTTOMPADDING",
                            (0, 0),
                            (-1, -1),
                            7,
                        ),
                    ]
                )
            )

            story.append(analysis_table)

            story.append(
                Paragraph(
                    (
                        "Cette valeur ne constitue pas un devis, "
                        "une estimation réglementaire, un intervalle "
                        "de confiance ou une garantie de coût."
                    ),
                    small_style,
                )
            )

            if isinstance(warnings, list) and warnings:
                warning_rows = [
                    [
                        paragraph(
                            "Attention",
                            table_label_style,
                        ),
                        paragraph(
                            warning,
                            body_style,
                        ),
                    ]
                    for warning in warnings
                ]

                warning_table = Table(
                    warning_rows,
                    colWidths=[
                        30 * mm,
                        145 * mm,
                    ],
                )

                warning_table.setStyle(
                    TableStyle(
                        [
                            (
                                "BACKGROUND",
                                (0, 0),
                                (0, -1),
                                LIGHT_WARNING,
                            ),
                            (
                                "GRID",
                                (0, 0),
                                (-1, -1),
                                0.5,
                                BORDER,
                            ),
                            (
                                "VALIGN",
                                (0, 0),
                                (-1, -1),
                                "TOP",
                            ),
                            (
                                "LEFTPADDING",
                                (0, 0),
                                (-1, -1),
                                7,
                            ),
                            (
                                "RIGHTPADDING",
                                (0, 0),
                                (-1, -1),
                                7,
                            ),
                            (
                                "TOPPADDING",
                                (0, 0),
                                (-1, -1),
                                7,
                            ),
                            (
                                "BOTTOMPADDING",
                                (0, 0),
                                (-1, -1),
                                7,
                            ),
                        ]
                    )
                )

                story.append(
                    Spacer(1, 3 * mm)
                )
                story.append(warning_table)

    if renovation_plan_data:
        actions = renovation_plan_data.get("actions")
        missing_information = renovation_plan_data.get(
            "missing_information"
        )
        risk_notes = renovation_plan_data.get("risk_notes")

        if not isinstance(actions, list):
            actions = []

        if not isinstance(missing_information, list):
            missing_information = []

        if not isinstance(risk_notes, list):
            risk_notes = []

        story.append(
            Paragraph(
                "Plan d'action préliminaire",
                heading_style,
            )
        )

        summary = renovation_plan_data.get("summary")

        if not isinstance(summary, dict):
            summary = {}

        summary_rows = [
            [
                paragraph("Indicateur", table_header_style),
                paragraph("Valeur", table_header_style),
                paragraph("Remarque", table_header_style),
            ],
            [
                paragraph("Actions proposées", table_label_style),
                paragraph(summary.get("actions_count"), body_style),
                paragraph("Priorisation préliminaire", small_style),
            ],
            [
                paragraph("Priorités hautes", table_label_style),
                paragraph(summary.get("high_priority_count"), body_style),
                paragraph("À vérifier avant devis", small_style),
            ],
            [
                paragraph("Informations manquantes", table_label_style),
                paragraph(summary.get("missing_information_count"), body_style),
                paragraph("Dossier à compléter", small_style),
            ],
            [
                paragraph("Fichiers justificatifs", table_label_style),
                paragraph(summary.get("evidence_files"), body_style),
                paragraph("Documents ou photos reçus", small_style),
            ],
        ]

        summary_table = Table(
            summary_rows,
            colWidths=[55 * mm, 35 * mm, 85 * mm],
            repeatRows=1,
        )

        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                        colors.white,
                        VERY_LIGHT_GREEN,
                    ]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(summary_table)

        if missing_information:
            story.append(
                Paragraph(
                    "Informations encore nécessaires",
                    heading_style,
                )
            )

            missing_rows = [
                [
                    paragraph("À compléter", table_label_style),
                    paragraph(item, body_style),
                ]
                for item in missing_information
            ]

            missing_table = Table(
                missing_rows,
                colWidths=[35 * mm, 140 * mm],
            )

            missing_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, -1), LIGHT_WARNING),
                        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 7),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ]
                )
            )

            story.append(missing_table)

        if risk_notes:
            story.append(
                Paragraph("Points de vigilance", heading_style)
            )

            risk_rows = [
                [
                    paragraph("Vigilance", table_label_style),
                    paragraph(note, body_style),
                ]
                for note in risk_notes
            ]

            risk_table = Table(
                risk_rows,
                colWidths=[35 * mm, 140 * mm],
            )

            risk_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, -1), LIGHT_WARNING),
                        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 7),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ]
                )
            )

            story.append(risk_table)

        if actions:
            story.append(
                Paragraph("Actions recommandées", heading_style)
            )

            for index, action in enumerate(actions, start=1):
                if not isinstance(action, dict):
                    continue

                evidence_needed = action.get("evidence_needed")
                contractor_questions = action.get("contractor_questions")

                if not isinstance(evidence_needed, list):
                    evidence_needed = []

                if not isinstance(contractor_questions, list):
                    contractor_questions = []

                action_rows = [
                    [
                        paragraph(
                            f"Action {index}",
                            table_label_style,
                        ),
                        paragraph(
                            action.get("title"),
                            body_style,
                        ),
                    ],
                    [
                        paragraph("Priorité", table_label_style),
                        paragraph(
                            action.get("priority"),
                            body_style,
                        ),
                    ],
                    [
                        paragraph("Pourquoi", table_label_style),
                        paragraph(
                            action.get("reason"),
                            body_style,
                        ),
                    ],
                    [
                        paragraph("À vérifier", table_label_style),
                        paragraph(
                            action.get("verification"),
                            body_style,
                        ),
                    ],
                    [
                        paragraph("Preuves utiles", table_label_style),
                        paragraph(
                            "; ".join(map(str, evidence_needed)),
                            body_style,
                        ),
                    ],
                    [
                        paragraph("Questions artisan", table_label_style),
                        paragraph(
                            "; ".join(map(str, contractor_questions)),
                            body_style,
                        ),
                    ],
                    [
                        paragraph("Statut chiffrage", table_label_style),
                        paragraph(
                            "Coût non chiffré · aide non vérifiée · gain non estimé",
                            small_style,
                        ),
                    ],
                ]

                action_table = Table(
                    action_rows,
                    colWidths=[38 * mm, 137 * mm],
                )

                action_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (0, -1), LIGHT_GREEN),
                            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                            ("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 7),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                            ("TOPPADDING", (0, 0), (-1, -1), 7),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                        ]
                    )
                )

                story.append(KeepTogether([action_table]))
                story.append(Spacer(1, 3 * mm))

    if quote_check_data:
        story.append(
            Paragraph(
                "Contrôle préliminaire du devis",
                heading_style,
            )
        )

        quote_file = quote_check_data.get("quote_file")
        amounts = quote_check_data.get("detected_amounts")
        categories = quote_check_data.get("work_categories")
        field_checks = quote_check_data.get("field_checks")
        red_flags = quote_check_data.get("red_flags")

        if not isinstance(quote_file, dict):
            quote_file = {}

        if not isinstance(amounts, list):
            amounts = []

        if not isinstance(categories, list):
            categories = []

        if not isinstance(field_checks, list):
            field_checks = []

        if not isinstance(red_flags, list):
            red_flags = []

        quote_rows = [
            [
                paragraph("Indicateur", table_header_style),
                paragraph("Valeur", table_header_style),
                paragraph("Remarque", table_header_style),
            ],
            [
                paragraph("Fichier analysé", table_label_style),
                paragraph(quote_file.get("filename"), body_style),
                paragraph("Devis PDF ajouté au projet", small_style),
            ],
            [
                paragraph("Score qualité", table_label_style),
                paragraph(
                    f"{quote_check_data.get('quality_score')} %",
                    body_style,
                ),
                paragraph(
                    "Score de complétude automatique, pas une validation juridique",
                    small_style,
                ),
            ],
            [
                paragraph("Statut", table_label_style),
                paragraph(quote_check_data.get("status"), body_style),
                paragraph("Revue humaine toujours nécessaire", small_style),
            ],
            [
                paragraph("Décision", table_label_style),
                paragraph("Signature automatique non recommandée", body_style),
                paragraph("Contrôle préliminaire uniquement", small_style),
            ],
        ]

        quote_table = Table(
            quote_rows,
            colWidths=[50 * mm, 55 * mm, 70 * mm],
            repeatRows=1,
        )

        quote_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                        colors.white,
                        VERY_LIGHT_GREEN,
                    ]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(quote_table)

        if amounts:
            story.append(
                Paragraph("Montants détectés", heading_style)
            )

            amount_rows = [
                [
                    paragraph("Montant", table_header_style),
                    paragraph("Contexte détecté", table_header_style),
                ]
            ]

            for item in amounts[:6]:
                if not isinstance(item, dict):
                    continue

                amount = item.get("amount_eur")

                amount_rows.append(
                    [
                        paragraph(
                            (
                                f"{int(amount):,}".replace(",", " ")
                                + " €"
                                if isinstance(amount, (int, float))
                                else amount
                            ),
                            body_style,
                        ),
                        paragraph(item.get("context"), small_style),
                    ]
                )

            amount_table = Table(
                amount_rows,
                colWidths=[35 * mm, 140 * mm],
                repeatRows=1,
            )

            amount_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 7),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ]
                )
            )

            story.append(amount_table)

        if field_checks:
            story.append(
                Paragraph("Mentions détectées", heading_style)
            )

            field_rows = [
                [
                    paragraph("Mention", table_header_style),
                    paragraph("État", table_header_style),
                    paragraph("Commentaire", table_header_style),
                ]
            ]

            for field in field_checks:
                if not isinstance(field, dict):
                    continue

                present = field.get("present") is True

                field_rows.append(
                    [
                        paragraph(field.get("label"), body_style),
                        paragraph(
                            "Détecté" if present else "Non détecté",
                            body_style,
                        ),
                        paragraph(
                            "À vérifier manuellement"
                            if not present
                            else "Présence repérée dans le texte PDF",
                            small_style,
                        ),
                    ]
                )

            field_table = Table(
                field_rows,
                colWidths=[70 * mm, 35 * mm, 70 * mm],
                repeatRows=1,
            )

            field_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                            colors.white,
                            VERY_LIGHT_GREEN,
                        ]),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 7),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ]
                )
            )

            story.append(field_table)

        if red_flags:
            story.append(
                Paragraph("Signaux d'alerte", heading_style)
            )

            flag_rows = []

            for flag in red_flags:
                if not isinstance(flag, dict):
                    continue

                flag_rows.append(
                    [
                        paragraph(flag.get("severity"), table_label_style),
                        paragraph(flag.get("title"), body_style),
                        paragraph(flag.get("detail"), small_style),
                    ]
                )

            flag_table = Table(
                flag_rows,
                colWidths=[28 * mm, 55 * mm, 92 * mm],
            )

            flag_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, -1), LIGHT_WARNING),
                        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("TOPPADDING", (0, 0), (-1, -1), 7),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                    ]
                )
            )

            story.append(flag_table)

        story.append(
            Paragraph(
                (
                    "Cette vérification ne valide pas les prix du devis, "
                    "ne confirme pas l'éligibilité aux aides et ne remplace "
                    "pas une revue par un professionnel qualifié."
                ),
                small_style,
            )
        )

    story.append(PageBreak())
    story.append(
        Paragraph(
            "Documents et photographies",
            heading_style,
        )
    )

    if evidence:
        evidence_rows = [
            [
                paragraph("Type", table_header_style),
                paragraph("Fichier", table_header_style),
                paragraph("Taille", table_header_style),
                paragraph("État", table_header_style),
            ]
        ]

        for item in evidence:
            evidence_rows.append(
                [
                    paragraph(
                        EVIDENCE_LABELS.get(
                            str(item.get("evidence_type")),
                            item.get("evidence_type"),
                        ),
                        body_style,
                    ),
                    paragraph(
                        item.get("original_filename"),
                        small_style,
                    ),
                    paragraph(
                        format_size(item.get("size_bytes")),
                        small_style,
                    ),
                    paragraph(
                        (
                            "Analyse en attente"
                            if item.get("analysis_status") == "pending"
                            else item.get("analysis_status")
                        ),
                        small_style,
                    ),
                ]
            )

        evidence_table = Table(
            evidence_rows,
            colWidths=[47 * mm, 72 * mm, 23 * mm, 33 * mm],
            repeatRows=1,
        )

        evidence_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                        colors.white,
                        VERY_LIGHT_GREEN,
                    ]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(evidence_table)
    else:
        story.append(
            Paragraph(
                "Aucun document ou aucune photographie n'a été ajouté au projet.",
                body_style,
            )
        )

    missing_information = snapshot.get(
        "missing_information",
        [],
    )

    if isinstance(missing_information, list) and missing_information:
        story.append(
            Paragraph(
                "Informations encore nécessaires",
                heading_style,
            )
        )

        missing_rows = []

        for item in missing_information:
            missing_rows.append(
                [
                    paragraph("À compléter", table_label_style),
                    paragraph(item, body_style),
                ]
            )

        missing_table = Table(
            missing_rows,
            colWidths=[35 * mm, 140 * mm],
        )

        missing_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), LIGHT_WARNING),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(missing_table)

    sources = snapshot.get("sources", [])

    if isinstance(sources, list) and sources:
        story.append(
            Paragraph("Sources déclarées", heading_style)
        )

        source_rows = [
            [
                paragraph("Source", table_header_style),
                paragraph("Jeu de données", table_header_style),
                paragraph("Caractère officiel", table_header_style),
            ]
        ]

        for source in sources:
            if not isinstance(source, dict):
                continue

            source_rows.append(
                [
                    paragraph(source.get("name"), body_style),
                    paragraph(source.get("dataset"), small_style),
                    paragraph(
                        "Oui"
                        if source.get("official") is True
                        else "Non ou non précisé",
                        small_style,
                    ),
                ]
            )

        source_table = Table(
            source_rows,
            colWidths=[55 * mm, 80 * mm, 40 * mm],
            repeatRows=1,
        )

        source_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(source_table)

    score = report.get("dossier_score")

    if isinstance(score, (int, float)):
        story.append(
            KeepTogether(
                [
                    Paragraph(
                        "Niveau de préparation du dossier",
                        heading_style,
                    ),
                    Table(
                        [
                            [
                                paragraph(
                                    f"{round(score)} %",
                                    title_style,
                                ),
                                paragraph(
                                    (
                                        "Ce pourcentage mesure uniquement "
                                        "la quantité d'informations disponibles. "
                                        "Il ne représente ni la performance "
                                        "énergétique ni la qualité du logement."
                                    ),
                                    body_style,
                                ),
                            ]
                        ],
                        colWidths=[42 * mm, 133 * mm],
                        style=TableStyle(
                            [
                                (
                                    "BACKGROUND",
                                    (0, 0),
                                    (-1, -1),
                                    LIGHT_GREEN,
                                ),
                                (
                                    "BOX",
                                    (0, 0),
                                    (-1, -1),
                                    0.7,
                                    BORDER,
                                ),
                                (
                                    "VALIGN",
                                    (0, 0),
                                    (-1, -1),
                                    "MIDDLE",
                                ),
                                (
                                    "LEFTPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    10,
                                ),
                                (
                                    "RIGHTPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    10,
                                ),
                                (
                                    "TOPPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    10,
                                ),
                                (
                                    "BOTTOMPADDING",
                                    (0, 0),
                                    (-1, -1),
                                    10,
                                ),
                            ]
                        ),
                    ),
                ]
            )
        )

    story.append(
        Paragraph(
            "Limites et avertissements",
            heading_style,
        )
    )

    limitations = [
        "Ce rapport est un document préliminaire de préparation.",
        "Il ne remplace pas un DPE réglementaire, un audit énergétique ou un diagnostic technique.",
        "Les photographies ne permettent pas de confirmer un défaut caché.",
        "Aucun prix de travaux, gain énergétique ou retour sur investissement n'est confirmé dans ce document.",
        "Aucune aide financière ou éligibilité à une subvention n'est garantie.",
        "Une visite et des devis de professionnels qualifiés restent nécessaires avant toute décision de travaux.",
    ]

    limitation_rows = [
        [
            paragraph(
                f"{index}.",
                table_label_style,
            ),
            paragraph(item, body_style),
        ]
        for index, item in enumerate(limitations, start=1)
    ]

    limitations_table = Table(
        limitation_rows,
        colWidths=[10 * mm, 165 * mm],
    )

    limitations_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_WARNING),
                ("BOX", (0, 0), (-1, -1), 0.7, BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TEXTCOLOR", (0, 0), (0, -1), WARNING),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    story.append(limitations_table)
    story.append(Spacer(1, 6 * mm))

    story.append(
        Paragraph(
            (
                "ZAMI sépare les données officielles, les "
                "déclarations du propriétaire et les éléments "
                "dont l'analyse reste en attente."
            ),
            subtitle_style,
        )
    )

    document.build(
        story,
        onFirstPage=page_footer,
        onLaterPages=page_footer,
    )

    buffer.seek(0)
    return buffer.getvalue()
