from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.managed_document_store import list_managed_documents
from app.managed_project_store import get_managed_project


FONT_NAME = "Helvetica"

DEJAVU_PATH = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
DEJAVU_BOLD_PATH = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")

if DEJAVU_PATH.exists():
    pdfmetrics.registerFont(TTFont("ZamiSans", str(DEJAVU_PATH)))
    FONT_NAME = "ZamiSans"

if DEJAVU_BOLD_PATH.exists():
    pdfmetrics.registerFont(TTFont("ZamiSansBold", str(DEJAVU_BOLD_PATH)))
    BOLD_FONT_NAME = "ZamiSansBold"
else:
    BOLD_FONT_NAME = "Helvetica-Bold"


def clean(value: Any, fallback: str = "Non precise") -> str:
    if value is None:
        return fallback

    text = str(value).strip()

    return text if text else fallback


def project_type_label(value: str | None) -> str:
    labels = {
        "renovation_complete": "Renovation complete",
        "insulation": "Isolation",
        "windows": "Fenetres / menuiseries",
        "heating": "Chauffage",
        "ventilation": "Ventilation",
        "unknown": "Projet a clarifier",
    }

    return labels.get(value or "", clean(value))


def urgency_label(value: str | None) -> str:
    labels = {
        "this_week": "Cette semaine",
        "this_month": "Ce mois-ci",
        "three_months": "Dans 3 mois",
        "not_urgent": "Pas urgent",
    }

    return labels.get(value or "", clean(value))


def document_type_label(value: str | None) -> str:
    labels = {
        "dpe": "DPE",
        "quote": "Devis",
        "photo": "Photo",
        "energy_bill": "Facture energie",
        "audit": "Audit energetique",
        "plan": "Plan",
        "other": "Autre",
    }

    return labels.get(value or "", clean(value, "Document"))


def p(text: Any) -> str:
    return escape(clean(text, ""))


def bullets(items: list[str]) -> str:
    if not items:
        return "Aucun element critique detecte."

    return "<br/>".join(f"- {escape(str(item))}" for item in items)


def build_managed_project_brief_pdf(
    managed_project_id: str,
    brief: dict[str, Any],
) -> bytes:
    project = get_managed_project(managed_project_id)

    if project is None:
        raise ValueError("Projet introuvable.")

    documents = list_managed_documents(managed_project_id)

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Dossier projet ZAMI - {managed_project_id}",
    )

    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "ZamiTitle",
            parent=base["Title"],
            fontName=BOLD_FONT_NAME,
            fontSize=23,
            leading=28,
            textColor=colors.HexColor("#202823"),
            spaceAfter=8,
            alignment=TA_LEFT,
        ),
        "subtitle": ParagraphStyle(
            "ZamiSubtitle",
            parent=base["Normal"],
            fontName=FONT_NAME,
            fontSize=9,
            leading=14,
            textColor=colors.HexColor("#68736b"),
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "ZamiH2",
            parent=base["Heading2"],
            fontName=BOLD_FONT_NAME,
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#168a4a"),
            spaceBefore=12,
            spaceAfter=7,
        ),
        "body": ParagraphStyle(
            "ZamiBody",
            parent=base["BodyText"],
            fontName=FONT_NAME,
            fontSize=9,
            leading=14,
            textColor=colors.HexColor("#26312a"),
        ),
        "small": ParagraphStyle(
            "ZamiSmall",
            parent=base["BodyText"],
            fontName=FONT_NAME,
            fontSize=8,
            leading=12,
            textColor=colors.HexColor("#68736b"),
        ),
        "box": ParagraphStyle(
            "ZamiBox",
            parent=base["BodyText"],
            fontName=FONT_NAME,
            fontSize=8,
            leading=12,
            textColor=colors.HexColor("#5f553f"),
        ),
    }

    story = []

    story.append(Paragraph("Dossier projet ZAMI", styles["title"]))
    story.append(
        Paragraph(
            f"Reference interne: {p(managed_project_id)}<br/>"
            "Document prepare pour le suivi interne, la revue humaine et la preparation des prochaines etapes.",
            styles["subtitle"],
        )
    )

    score_data = [
        [
            Paragraph("<b>Score de preparation</b>", styles["body"]),
            Paragraph("<b>Niveau dossier</b>", styles["body"]),
        ],
        [
            Paragraph(f"{brief.get('readiness_score', 0)}/100", styles["body"]),
            Paragraph(p(brief.get("risk_level")), styles["body"]),
        ],
    ]

    score_table = Table(score_data, colWidths=[78 * mm, 78 * mm])
    score_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff8f2")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfe1d4")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe8e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    story.append(score_table)

    story.append(Paragraph("1. Resume du projet", styles["h2"]))
    story.append(Paragraph(p(brief.get("summary")), styles["body"]))

    story.append(Paragraph("2. Informations logement et client", styles["h2"]))

    info_data = [
        ["Client", clean(project.get("contact_name"))],
        ["Email", clean(project.get("contact_email"))],
        ["Telephone", clean(project.get("contact_phone"))],
        ["Adresse", clean(project.get("address"))],
        ["Ville", clean(project.get("city"))],
        ["Type de projet", project_type_label(project.get("project_type"))],
        ["Urgence", urgency_label(project.get("urgency"))],
        ["Surface", f"{clean(project.get('surface_m2'))} m2"],
        ["DPE", clean(project.get("dpe_class"), "Non connu")],
        ["Devis deja recu", "Oui" if project.get("has_quote") else "Non"],
        ["Artisan deja trouve", "Oui" if project.get("has_artisan") else "Non"],
        ["Budget", clean(project.get("budget_range"))],
    ]

    info_table = Table(
        [
            [
                Paragraph(f"<b>{escape(k)}</b>", styles["small"]),
                Paragraph(escape(v), styles["small"]),
            ]
            for k, v in info_data
        ],
        colWidths=[48 * mm, 108 * mm],
    )
    info_table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe8e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#edf2ee")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f7fbf8")),
                ("PADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    story.append(info_table)

    story.append(Paragraph("3. Description client", styles["h2"]))
    story.append(Paragraph(p(project.get("description", "Non precisee.")), styles["body"]))

    story.append(Paragraph("4. Documents disponibles", styles["h2"]))

    if documents:
        doc_rows = [
            [
                Paragraph("<b>Type</b>", styles["small"]),
                Paragraph("<b>Fichier</b>", styles["small"]),
                Paragraph("<b>Taille</b>", styles["small"]),
            ]
        ]

        for document in documents:
            size_kb = max(1, round(int(document.get("size_bytes") or 0) / 1024))
            doc_rows.append(
                [
                    Paragraph(document_type_label(document.get("document_type")), styles["small"]),
                    Paragraph(p(document.get("original_filename")), styles["small"]),
                    Paragraph(f"{size_kb} KB", styles["small"]),
                ]
            )

        docs_table = Table(doc_rows, colWidths=[38 * mm, 88 * mm, 30 * mm])
        docs_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff8f2")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#dfe8e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#edf2ee")),
                    ("PADDING", (0, 0), (-1, -1), 6),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(docs_table)
    else:
        story.append(Paragraph("Aucun document ajoute pour ce lead.", styles["body"]))

    story.append(Paragraph("5. Documents manquants", styles["h2"]))
    story.append(
        Paragraph(
            bullets(list(brief.get("missing_documents") or [])),
            styles["body"],
        )
    )

    story.append(Paragraph("6. Actions prioritaires", styles["h2"]))
    story.append(
        Paragraph(
            bullets(list(brief.get("priority_actions") or [])),
            styles["body"],
        )
    )

    story.append(Paragraph("7. Questions a poser", styles["h2"]))
    story.append(
        Paragraph(
            bullets(list(brief.get("contractor_questions") or [])),
            styles["body"],
        )
    )

    story.append(Paragraph("8. Message client pret a envoyer", styles["h2"]))
    story.append(
        Table(
            [[Paragraph(p(brief.get("homeowner_message")), styles["box"])]],
            colWidths=[156 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffaf0")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#ead5b0")),
                    ("PADDING", (0, 0), (-1, -1), 8),
                ]
            ),
        )
    )

    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "Note: ZAMI aide a preparer, structurer et verifier les informations disponibles. "
            "Ce dossier ne constitue pas une garantie definitive sur un professionnel, un prix ou un chantier. "
            "Une revue humaine reste recommandee avant toute mise en relation ou signature.",
            styles["small"],
        )
    )

    doc.build(story)

    return buffer.getvalue()
