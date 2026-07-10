from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


GREEN = colors.HexColor("#168A4A")
DARK = colors.HexColor("#1F2A23")
MUTED = colors.HexColor("#66716A")
LIGHT_GREEN = colors.HexColor("#EFF8F2")
BORDER = colors.HexColor("#DDE8E1")
WARNING_BG = colors.HexColor("#FDF8ED")


def safe(value: Any, fallback: str = "Non disponible") -> str:
    if value is None or value == "":
        return fallback

    return str(value)


def money(value: Any) -> str:
    if not isinstance(value, (int, float)):
        return "Non détecté"

    return f"{int(round(value)):,}".replace(",", " ") + " €"


def status_label(status: str) -> str:
    labels = {
        "structured": "Devis plutôt structuré",
        "weak_quote": "Devis faible ou incomplet",
        "needs_review": "Revue nécessaire",
        "verified": "Entreprise trouvée officiellement",
        "possible_match": "Correspondance possible",
        "not_found": "Non trouvée officiellement",
        "unavailable": "Source officielle indisponible",
    }

    return labels.get(status, status or "Non vérifié")


def build_contractor_message(quote_check: dict[str, Any]) -> str:
    fields = quote_check.get("field_checks")

    if not isinstance(fields, list):
        fields = []

    missing_fields = [
        safe(field.get("label"))
        for field in fields
        if isinstance(field, dict) and not field.get("present")
    ]

    company = quote_check.get("company_identifiers")

    if not isinstance(company, dict):
        company = {}

    official = quote_check.get("official_company_verification")

    if not isinstance(official, dict):
        official = {}

    amount_summary = quote_check.get("amount_summary")

    if not isinstance(amount_summary, dict):
        amount_summary = {}

    lines = [
        "Bonjour,",
        "",
        "Merci pour votre devis. Avant toute signature ou paiement d'acompte, pourriez-vous me transmettre / confirmer les éléments suivants :",
        "",
    ]

    if company.get("siret") or company.get("siren"):
        lines.append(
            "- Confirmation de vos identifiants entreprise : "
            + (
                f"SIRET {company.get('siret')}"
                if company.get("siret")
                else ""
            )
            + (
                f" / SIREN {company.get('siren')}"
                if company.get("siren")
                else ""
            )
        )
    else:
        lines.append("- Votre SIRET/SIREN complet")

    if official.get("status") == "verified":
        lines.append(
            "- Confirmation que l'entreprise indiquée dans le devis correspond bien à votre établissement officiel"
        )
    else:
        lines.append(
            "- Un justificatif officiel de l'entreprise si le SIRET/SIREN ne correspond pas clairement au devis"
        )

    lines.extend(
        [
            "- Une attestation d'assurance décennale à jour couvrant les travaux prévus",
            "- Une attestation de responsabilité civile professionnelle",
            "- La confirmation de votre qualification RGE si les aides publiques sont visées",
        ]
    )

    if missing_fields:
        lines.append(
            "- Les informations manquantes ou peu claires dans le devis : "
            + ", ".join(missing_fields)
        )

    if isinstance(amount_summary.get("main_total_eur"), (int, float)):
        lines.append(
            "- Confirmation du montant total TTC du devis : "
            + money(amount_summary.get("main_total_eur"))
        )

    lines.extend(
        [
            "- Le détail HT / TVA / TTC par poste de travaux",
            "- Les conditions de paiement, montant d'acompte, échéances et solde",
            "- La durée de validité du devis",
            "- Le délai prévisionnel de début et de fin des travaux",
            "",
            "Je souhaite simplement vérifier ces éléments avant de signer.",
            "",
            "Cordialement,",
        ]
    )

    return "\n".join(lines)


def p(value: Any, style: ParagraphStyle) -> Paragraph:
    clean = safe(value, "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    clean = clean.replace("\n", "<br/>")

    return Paragraph(clean, style)


def generate_quote_check_pdf(
    project: dict[str, Any],
    quote_check_record: dict[str, Any],
) -> bytes:
    quote_check = quote_check_record.get("quote_check")

    if not isinstance(quote_check, dict):
        quote_check = {}

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="Rapport QuoteGuard ZAMI",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ZamiTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=23,
        leading=27,
        textColor=DARK,
        alignment=TA_CENTER,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "ZamiSubtitle",
        parent=styles["BodyText"],
        fontSize=9,
        leading=14,
        textColor=MUTED,
        alignment=TA_CENTER,
        spaceAfter=16,
    )

    heading_style = ParagraphStyle(
        "ZamiHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=DARK,
        spaceBefore=14,
        spaceAfter=8,
    )

    body_style = ParagraphStyle(
        "ZamiBody",
        parent=styles["BodyText"],
        fontSize=8,
        leading=12,
        textColor=DARK,
    )

    small_style = ParagraphStyle(
        "ZamiSmall",
        parent=styles["BodyText"],
        fontSize=7,
        leading=10,
        textColor=MUTED,
    )

    header_style = ParagraphStyle(
        "ZamiHeader",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    label_style = ParagraphStyle(
        "ZamiLabel",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=DARK,
    )

    story: list[Any] = []

    story.append(p("QuoteGuard par ZAMI", title_style))
    story.append(
        p(
            "Contrôle préliminaire automatique d'un devis travaux. "
            "Ce rapport indique un niveau de risque et les vérifications nécessaires. "
            "Il ne remplace pas une revue juridique, technique ou administrative.",
            subtitle_style,
        )
    )

    quote_file = quote_check.get("quote_file")

    if not isinstance(quote_file, dict):
        quote_file = {}

    authenticity = quote_check.get("authenticity_assessment")

    if not isinstance(authenticity, dict):
        authenticity = {}

    amount_summary = quote_check.get("amount_summary")

    if not isinstance(amount_summary, dict):
        amount_summary = {}

    company = quote_check.get("company_identifiers")

    if not isinstance(company, dict):
        company = {}

    official = quote_check.get("official_company_verification")

    if not isinstance(official, dict):
        official = {}

    summary_rows = [
        [
            p("Indicateur", header_style),
            p("Valeur", header_style),
            p("Note", header_style),
        ],
        [
            p("Fichier analysé", label_style),
            p(quote_file.get("filename"), body_style),
            p("Fichier uploadé dans QuoteGuard", small_style),
        ],
        [
            p("Score qualité", label_style),
            p(f"{safe(quote_check.get('quality_score'))} %", body_style),
            p(status_label(safe(quote_check.get("status"), "")), small_style),
        ],
        [
            p("Indice d'authenticité", label_style),
            p(f"{safe(authenticity.get('score'))} %", body_style),
            p(authenticity.get("summary"), small_style),
        ],
        [
            p("Montant principal probable", label_style),
            p(money(amount_summary.get("main_total_eur")), body_style),
            p(amount_summary.get("note"), small_style),
        ],
        [
            p("SIRET / SIREN détecté", label_style),
            p(
                (
                    f"SIRET: {company.get('siret')}<br/>"
                    if company.get("siret")
                    else ""
                )
                + (
                    f"SIREN: {company.get('siren')}"
                    if company.get("siren")
                    else ""
                ),
                body_style,
            ),
            p("À confirmer avec source officielle", small_style),
        ],
        [
            p("Vérification officielle", label_style),
            p(status_label(safe(official.get("status"), "")), body_style),
            p(official.get("provider"), small_style),
        ],
    ]

    summary_table = Table(
        summary_rows,
        colWidths=[46 * mm, 52 * mm, 78 * mm],
        repeatRows=1,
    )

    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREEN]),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    story.append(summary_table)

    if official:
        story.append(p("Vérification officielle entreprise", heading_style))

        official_rows = [
            [p("Nom officiel", label_style), p(official.get("official_name"), body_style)],
            [p("SIRET", label_style), p(official.get("siret"), body_style)],
            [p("SIREN", label_style), p(official.get("siren"), body_style)],
            [p("Adresse", label_style), p(official.get("address"), body_style)],
            [
                p("État administratif", label_style),
                p(
                    "Entreprise active"
                    if official.get("active") is True
                    else "Entreprise non active / fermée"
                    if official.get("active") is False
                    else "État non déterminé",
                    body_style,
                ),
            ],
        ]

        official_table = Table(
            official_rows,
            colWidths=[52 * mm, 124 * mm],
        )

        official_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BACKGROUND", (0, 0), (0, -1), LIGHT_GREEN),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(official_table)

    fields = quote_check.get("field_checks")

    if isinstance(fields, list) and fields:
        story.append(p("Mentions importantes du devis", heading_style))

        field_rows = [
            [
                p("Mention", header_style),
                p("État", header_style),
                p("Commentaire", header_style),
            ]
        ]

        for field in fields:
            if not isinstance(field, dict):
                continue

            present = field.get("present") is True

            field_rows.append(
                [
                    p(field.get("label"), body_style),
                    p("Détecté" if present else "Non détecté", body_style),
                    p(
                        "Présence repérée dans le devis"
                        if present
                        else "À demander / vérifier avant signature",
                        small_style,
                    ),
                ]
            )

        field_table = Table(
            field_rows,
            colWidths=[66 * mm, 34 * mm, 76 * mm],
            repeatRows=1,
        )

        field_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GREEN]),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(field_table)

    flags = quote_check.get("red_flags")

    if isinstance(flags, list) and flags:
        story.append(p("Signaux d'alerte", heading_style))

        flag_rows = [
            [
                p("Risque", header_style),
                p("Signal", header_style),
                p("Détail", header_style),
            ]
        ]

        for flag in flags:
            if not isinstance(flag, dict):
                continue

            flag_rows.append(
                [
                    p(status_label(safe(flag.get("severity"), "")), body_style),
                    p(flag.get("title"), body_style),
                    p(flag.get("detail"), small_style),
                ]
            )

        flag_table = Table(
            flag_rows,
            colWidths=[30 * mm, 56 * mm, 90 * mm],
            repeatRows=1,
        )

        flag_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                    ("BACKGROUND", (0, 1), (-1, -1), WARNING_BG),
                    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )

        story.append(flag_table)

    story.append(p("Message à envoyer à l'artisan", heading_style))
    story.append(p(build_contractor_message(quote_check), body_style))

    story.append(Spacer(1, 9 * mm))
    story.append(
        p(
            "Limite importante : ZAMI ne déclare pas automatiquement un devis fake ou authentique. "
            "ZAMI indique un niveau de risque, les incohérences détectées et les preuves à demander.",
            small_style,
        )
    )

    doc.build(story)

    return buffer.getvalue()
