from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz
import pytesseract
from PIL import Image
from pypdf import PdfReader

from app.evidence_store import UPLOAD_ROOT
from app.services.company_verification import verify_company_identifier


class QuoteCheckInputError(Exception):
    def __init__(
        self,
        message: str,
        missing: list[str] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.missing = missing or []


@dataclass
class ExtractedText:
    text: str
    method: str
    confidence: float | None
    pages_or_images: int
    warnings: list[str]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def fold_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(
        char
        for char in normalized
        if not unicodedata.combining(char)
    )

    return ascii_text.lower()


def compact_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", fold_text(value))


def compact_keyword(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", fold_text(value))


def has_keyword(
    folded: str,
    compacted: str,
    keyword: str,
) -> bool:
    normal = fold_text(keyword)
    compacted_keyword = compact_keyword(keyword)

    return normal in folded or compacted_keyword in compacted


def has_any_keyword(
    folded: str,
    compacted: str,
    keywords: list[str],
) -> bool:
    return any(
        has_keyword(folded, compacted, keyword)
        for keyword in keywords
    )


def has_company_number(
    folded: str,
    compacted: str,
) -> bool:
    if re.search(r"\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b", folded):
        return True

    if re.search(r"\d{14}", compacted):
        return True

    if "siren" in compacted and re.search(r"\d{9}", compacted):
        return True

    if "siret" in compacted and re.search(r"\d{14}", compacted):
        return True

    return False


def has_date(
    folded: str,
    compacted: str,
) -> bool:
    if re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", folded):
        return True

    if re.search(r"\d{8}", compacted):
        return True

    return False


def extract_company_identifiers(text: str) -> dict[str, Any]:
    folded = fold_text(text)
    compacted = compact_text(text)

    siren: str | None = None
    siret: str | None = None

    # Strong match: SIRET keyword followed by 14 digits.
    siret_match = re.search(
        r"siret(?:n|no|numero)?(\d{14})",
        compacted,
    )

    if siret_match:
        siret = siret_match.group(1)

    # Some devis incorrectly write "SIREN N°" before a 14-digit SIRET.
    siren_14_match = re.search(
        r"sirenn?(?:o|numero)?(\d{14})",
        compacted,
    )

    if not siret and siren_14_match:
        siret = siren_14_match.group(1)

    # Strong match: SIREN keyword followed by 9 digits.
    siren_match = re.search(
        r"sirenn?(?:o|numero)?(\d{9})",
        compacted,
    )

    if siren_match:
        siren = siren_match.group(1)

    # TVA intracommunautaire often contains FR + 2 digits + SIREN.
    if not siren:
        tva_match = re.search(
            r"fr\d{2}(\d{9})",
            compacted,
        )

        if tva_match:
            siren = tva_match.group(1)

    # RCS Paris B 941077695 pattern.
    if not siren:
        rcs_match = re.search(
            r"rcs[a-z]*b?(\d{9})",
            compacted,
        )

        if rcs_match:
            siren = rcs_match.group(1)

    # If SIRET exists, SIREN is first 9 digits.
    if siret and not siren:
        siren = siret[:9]

    # Generic 14-digit candidates are dangerous.
    # Only accept them when they start with the detected SIREN.
    if siren and not siret:
        candidates = sorted(set(re.findall(r"\d{14}", compacted)))

        for candidate in candidates:
            if candidate.startswith(siren):
                siret = candidate
                break

    # Avoid obvious false positives from prices/pages.
    if siret and siret.startswith("000"):
        if siren:
            siret = None
        else:
            siret = None

    return {
        "siren": siren,
        "siret": siret,
        "detected": bool(siren or siret),
        "official_verification_status": "not_checked",
        "official_verification_note": "Vérification officielle SIRENE/RGE à ajouter.",
    }


def build_amount_summary(amounts: list[dict[str, Any]]) -> dict[str, Any]:
    valid_amounts = [
        item
        for item in amounts
        if isinstance(item.get("amount_eur"), (int, float))
    ]

    if not valid_amounts:
        return {
            "main_total_eur": None,
            "other_amounts_eur": [],
            "note": "Aucun montant fiable détecté automatiquement.",
        }

    # Current heuristic: largest amount is likely the full project total.
    # Later we can improve with page labels like TOTAL TTC / NET À PAYER.
    sorted_amounts = sorted(
        valid_amounts,
        key=lambda item: item["amount_eur"],
        reverse=True,
    )

    main_total = sorted_amounts[0]["amount_eur"]
    other_amounts = []

    for item in sorted_amounts[1:8]:
        value = item["amount_eur"]

        if value != main_total:
            other_amounts.append(value)

    return {
        "main_total_eur": main_total,
        "other_amounts_eur": other_amounts[:6],
        "note": "Montant principal estimé automatiquement à partir du devis.",
    }





def parse_euro_amount(value: str) -> float | None:
    clean = value.replace("\u00a0", " ").strip()
    clean = re.sub(r"[^\d,.\s]", "", clean)
    clean = clean.replace(" ", "")

    if not clean:
        return None

    if "," in clean and "." in clean:
        clean = clean.replace(".", "").replace(",", ".")
    elif "," in clean:
        clean = clean.replace(",", ".")

    try:
        amount = float(clean)
    except ValueError:
        return None

    if amount < 10:
        return None

    return round(amount, 2)


def extract_pdf_text_with_pypdf(path: Path) -> ExtractedText:
    warnings: list[str] = []

    try:
        reader = PdfReader(str(path))
        chunks: list[str] = []

        for page in reader.pages[:10]:
            chunks.append(page.extract_text() or "")

        text = normalize_text("\n".join(chunks))

        return ExtractedText(
            text=text,
            method="pdf_text",
            confidence=None,
            pages_or_images=min(len(reader.pages), 10),
            warnings=warnings,
        )
    except Exception as error:
        return ExtractedText(
            text="",
            method="pdf_text_failed",
            confidence=None,
            pages_or_images=0,
            warnings=[f"PDF text extraction failed: {error}"],
        )


def ocr_pil_image(image: Image.Image) -> tuple[str, float | None]:
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    try:
        data = pytesseract.image_to_data(
            image,
            lang="fra+eng",
            output_type=pytesseract.Output.DICT,
            config="--psm 6",
        )
    except pytesseract.TesseractNotFoundError as error:
        raise QuoteCheckInputError(
            "OCR non disponible: Tesseract n'est pas installé dans l'environnement.",
            ["ocr_engine"],
        ) from error

    words: list[str] = []
    confidences: list[float] = []

    for index, raw_text in enumerate(data.get("text", [])):
        word = str(raw_text).strip()

        if word:
            words.append(word)

        try:
            confidence = float(data.get("conf", [])[index])
        except Exception:
            continue

        if confidence >= 0:
            confidences.append(confidence)

    text = normalize_text(" ".join(words))

    average_confidence = None

    if confidences:
        average_confidence = round(
            sum(confidences) / len(confidences) / 100,
            3,
        )

    return text, average_confidence


def extract_image_text(path: Path) -> ExtractedText:
    warnings: list[str] = []

    try:
        image = Image.open(path)
        text, confidence = ocr_pil_image(image)

        return ExtractedText(
            text=text,
            method="image_ocr",
            confidence=confidence,
            pages_or_images=1,
            warnings=warnings,
        )
    except QuoteCheckInputError:
        raise
    except Exception as error:
        return ExtractedText(
            text="",
            method="image_ocr_failed",
            confidence=None,
            pages_or_images=0,
            warnings=[f"Image OCR failed: {error}"],
        )


def extract_pdf_ocr_text(path: Path) -> ExtractedText:
    warnings: list[str] = []
    chunks: list[str] = []
    confidences: list[float] = []

    try:
        document = fitz.open(path)
    except Exception as error:
        return ExtractedText(
            text="",
            method="pdf_ocr_failed",
            confidence=None,
            pages_or_images=0,
            warnings=[f"PDF rendering failed: {error}"],
        )

    page_count = min(len(document), 6)

    for page_index in range(page_count):
        try:
            page = document.load_page(page_index)
            pixmap = page.get_pixmap(
                matrix=fitz.Matrix(2.2, 2.2),
                alpha=False,
            )

            image = Image.frombytes(
                "RGB",
                [pixmap.width, pixmap.height],
                pixmap.samples,
            )

            text, confidence = ocr_pil_image(image)
            chunks.append(text)

            if confidence is not None:
                confidences.append(confidence)
        except QuoteCheckInputError:
            raise
        except Exception as error:
            warnings.append(
                f"OCR page {page_index + 1} failed: {error}"
            )

    average_confidence = None

    if confidences:
        average_confidence = round(
            sum(confidences) / len(confidences),
            3,
        )

    return ExtractedText(
        text=normalize_text("\n".join(chunks)),
        method="pdf_ocr",
        confidence=average_confidence,
        pages_or_images=page_count,
        warnings=warnings,
    )


def extract_text_from_file(path: Path, file_kind: str) -> ExtractedText:
    suffix = path.suffix.lower()
    kind = file_kind.lower()

    if suffix == ".pdf" or kind == "pdf":
        direct = extract_pdf_text_with_pypdf(path)

        if len(direct.text) >= 300:
            return direct

        ocr = extract_pdf_ocr_text(path)
        ocr.warnings = direct.warnings + ocr.warnings

        if len(ocr.text) > len(direct.text):
            return ocr

        return direct

    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".jfif"} or kind in {
        "jpg",
        "jpeg",
        "png",
        "webp",
        "image",
    }:
        return extract_image_text(path)

    raise QuoteCheckInputError(
        "Type de fichier non supporté pour le contrôle devis.",
        ["supported_quote_file"],
    )


def find_amounts(text: str) -> list[dict[str, Any]]:
    folded = fold_text(text)
    results: list[dict[str, Any]] = []

    patterns = [
        r"([0-9][0-9\s.,]{1,14})\s*(?:€|eur|euros?)",
        r"(?:total|montant|ttc|net a payer)[^\d]{0,30}([0-9][0-9\s.,]{1,14})",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, folded):
            amount = parse_euro_amount(match.group(1))

            if amount is None:
                continue

            start = max(0, match.start() - 95)
            end = min(len(text), match.end() + 95)
            context = normalize_text(text[start:end])

            context_folded = fold_text(context)
            priority = 0

            if any(
                keyword in context_folded
                for keyword in [
                    "total",
                    "ttc",
                    "net a payer",
                    "montant",
                    "a payer",
                ]
            ):
                priority += 100000

            results.append(
                {
                    "amount_eur": amount,
                    "context": context,
                    "_priority": priority,
                }
            )

    unique: list[dict[str, Any]] = []
    seen: set[float] = set()

    for item in sorted(
        results,
        key=lambda entry: (
            entry["_priority"],
            entry["amount_eur"],
        ),
        reverse=True,
    ):
        amount = item["amount_eur"]

        if amount in seen:
            continue

        seen.add(amount)
        item.pop("_priority", None)
        unique.append(item)

    return unique[:10]


def detect_work_categories(text: str) -> list[dict[str, Any]]:
    folded = fold_text(text)
    compacted = compact_text(text)

    categories = {
        "isolation_toiture_combles": [
            "combles",
            "toiture",
            "laine de verre",
            "laine de roche",
            "isolant toiture",
            "isolation toiture",
        ],
        "isolation_murs": [
            "isolation mur",
            "isolation murs",
            "ite",
            "isolation exterieure",
            "isolation interieure",
        ],
        "fenetres_menuiseries": [
            "fenetre",
            "fenetres",
            "menuiserie",
            "double vitrage",
            "triple vitrage",
        ],
        "chauffage": [
            "chaudiere",
            "pompe a chaleur",
            "pac",
            "radiateur",
            "chauffage",
        ],
        "ventilation": [
            "vmc",
            "ventilation",
            "double flux",
            "simple flux",
        ],
        "audit_dpe": [
            "audit energetique",
            "dpe",
            "diagnostic de performance energetique",
        ],
    }

    detected: list[dict[str, Any]] = []

    for code, keywords in categories.items():
        matched = [
            keyword
            for keyword in keywords
            if has_keyword(folded, compacted, keyword)
        ]

        if matched:
            detected.append(
                {
                    "code": code,
                    "matched_keywords": matched[:6],
                }
            )

    return detected


def check_required_quote_fields(
    text: str,
    amounts: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    folded = fold_text(text)
    compacted = compact_text(text)

    checks = [
        (
            "company_identity",
            "Identité de l'entreprise",
            [
                "siret",
                "siren",
                "rcs",
                "societe",
                "entreprise",
                "tva intracommunautaire",
            ],
            r"\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b",
        ),
        (
            "client_or_site_address",
            "Adresse client ou chantier",
            [
                "adresse",
                "chantier",
                "lieu des travaux",
                "adresse des travaux",
            ],
            None,
        ),
        (
            "date",
            "Date du devis",
            [
                "date",
                "emis le",
                "devis du",
            ],
            r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        ),
        (
            "validity",
            "Durée de validité",
            [
                "validite",
                "valable",
                "valid",
                "delai de validite",
            ],
            None,
        ),
        (
            "tva",
            "TVA",
            [
                "tva",
                "vat",
                "taxe",
                "ht",
                "ttc",
            ],
            None,
        ),
        (
            "total_amount",
            "Total ou montant TTC",
            [
                "total",
                "ttc",
                "montant",
                "net a payer",
            ],
            None,
        ),
        (
            "line_items",
            "Détail des lignes de travaux",
            [
                "quantite",
                "qte",
                "unite",
                "prix unitaire",
                "pu",
                "designation",
                "description",
            ],
            None,
        ),
        (
            "payment_terms",
            "Conditions de paiement",
            [
                "acompte",
                "paiement",
                "echeance",
                "solde",
                "conditions de reglement",
            ],
            None,
        ),
        (
            "insurance",
            "Assurance ou garantie",
            [
                "assurance",
                "decennale",
                "garantie",
                "responsabilite civile",
            ],
            None,
        ),
    ]

    results: list[dict[str, Any]] = []

    for code, label, keywords, regex in checks:
        present = has_any_keyword(folded, compacted, keywords)

        if regex and re.search(regex, folded):
            present = True

        if code == "company_identity" and has_company_number(folded, compacted):
            present = True

        if code == "date" and has_date(folded, compacted):
            present = True

        if code == "total_amount" and amounts:
            present = True

        results.append(
            {
                "code": code,
                "label": label,
                "present": present,
                "matched_keywords": [
                    keyword
                    for keyword in keywords
                    if keyword in folded
                ],
            }
        )

    return results


def detect_red_flags(
    text: str,
    amounts: list[dict[str, Any]],
    fields: list[dict[str, Any]],
    extracted: ExtractedText,
) -> list[dict[str, Any]]:
    folded = fold_text(text)
    compacted = compact_text(text)
    flags: list[dict[str, Any]] = []

    missing_fields = [
        item["label"]
        for item in fields
        if not item["present"]
    ]

    if missing_fields:
        flags.append(
            {
                "severity": "medium",
                "title": "Informations obligatoires ou utiles absentes",
                "detail": ", ".join(missing_fields[:6]),
            }
        )

    if not amounts:
        flags.append(
            {
                "severity": "high",
                "title": "Montant total non détecté",
                "detail": "Le devis doit être relu manuellement.",
            }
        )

    if "rge" not in compacted:
        flags.append(
            {
                "severity": "medium",
                "title": "Mention RGE non détectée",
                "detail": "À vérifier si les aides publiques sont visées.",
            }
        )

    if "decennale" not in compacted:
        flags.append(
            {
                "severity": "medium",
                "title": "Assurance décennale non détectée",
                "detail": "Demander une attestation à jour avant signature.",
            }
        )

    if extracted.method in {"image_ocr", "pdf_ocr"}:
        if extracted.confidence is not None and extracted.confidence < 0.55:
            flags.append(
                {
                    "severity": "medium",
                    "title": "Qualité OCR faible",
                    "detail": "La photo ou le scan peut être flou. Vérifiez les résultats manuellement.",
                }
            )

    if "acompte" in folded:
        match = re.search(r"acompte[^0-9]{0,25}(\d{1,3})\s*%", folded)

        if match:
            percent = int(match.group(1))

            if percent >= 50:
                flags.append(
                    {
                        "severity": "high",
                        "title": "Acompte élevé détecté",
                        "detail": f"Acompte mentionné : {percent}%.",
                    }
                )

    vague_terms = [
        "forfait",
        "divers",
        "a definir",
        "selon besoin",
        "a voir",
    ]

    matched_vague = [
        term
        for term in vague_terms
        if term in folded
    ]

    if matched_vague:
        flags.append(
            {
                "severity": "medium",
                "title": "Formulations vagues détectées",
                "detail": ", ".join(matched_vague),
            }
        )

    return flags


def compute_quality_score(
    fields: list[dict[str, Any]],
    red_flags: list[dict[str, Any]],
    categories: list[dict[str, Any]],
    extracted: ExtractedText,
) -> int:
    present_count = sum(1 for item in fields if item["present"])
    base = int((present_count / max(len(fields), 1)) * 75)
    category_bonus = min(15, len(categories) * 3)

    extraction_bonus = 0

    if extracted.method == "pdf_text":
        extraction_bonus = 10
    elif extracted.method in {"pdf_ocr", "image_ocr"}:
        if extracted.confidence is not None:
            extraction_bonus = int(max(0, min(10, extracted.confidence * 10)))
        else:
            extraction_bonus = 4

    penalty = 0

    for flag in red_flags:
        if flag["severity"] == "high":
            penalty += 18
        elif flag["severity"] == "medium":
            penalty += 8
        else:
            penalty += 3

    return max(0, min(100, base + category_bonus + extraction_bonus - penalty))


def build_authenticity_assessment(
    text: str,
    fields: list[dict[str, Any]],
    amounts: list[dict[str, Any]],
    red_flags: list[dict[str, Any]],
) -> dict[str, Any]:
    folded = fold_text(text)
    compacted = compact_text(text)

    high_count = sum(
        1
        for flag in red_flags
        if flag.get("severity") == "high"
    )

    medium_count = sum(
        1
        for flag in red_flags
        if flag.get("severity") == "medium"
    )

    missing_count = sum(
        1
        for field in fields
        if not field["present"]
    )

    score = max(
        0,
        min(
            100,
            100 - high_count * 22 - medium_count * 8 - missing_count * 5,
        ),
    )

    if score >= 75:
        level = "plausible_but_unverified"
        summary = "Le devis paraît structuré, mais les documents officiels doivent encore être vérifiés."
    elif score >= 45:
        level = "needs_verification"
        summary = "Le devis contient des éléments incomplets. Vérification manuelle nécessaire."
    else:
        level = "high_risk_incomplete"
        summary = "Le devis est incomplet ou difficile à vérifier automatiquement."

    checks = [
        {
            "label": "SIRET / identité entreprise",
            "present": any(
                field["code"] == "company_identity" and field["present"]
                for field in fields
            ),
            "detail": "À confirmer avec une source officielle.",
        },
        {
            "label": "Montant détecté",
            "present": bool(amounts),
            "detail": "Le montant doit correspondre au devis original.",
        },
        {
            "label": "TVA / HT / TTC",
            "present": any(
                field["code"] == "tva" and field["present"]
                for field in fields
            ),
            "detail": "Vérifier le taux appliqué.",
        },
        {
            "label": "RGE",
            "present": "rge" in compacted,
            "detail": "À vérifier si aides publiques visées.",
        },
        {
            "label": "Assurance décennale",
            "present": "decennale" in compacted,
            "detail": "Demander une attestation à jour.",
        },
    ]

    return {
        "score": score,
        "level": level,
        "summary": summary,
        "checks": checks,
        "important_note": "ZAMI ne déclare pas automatiquement un devis fake ou authentique. ZAMI indique un niveau de risque et les vérifications nécessaires.",
    }


def get_quote_candidates(
    project_id: str,
    evidence: list[dict[str, Any]],
) -> list[tuple[dict[str, Any], Path]]:
    candidates: list[tuple[dict[str, Any], Path]] = []

    for item in evidence:
        if item.get("evidence_type") != "quote":
            continue

        stored_filename = Path(str(item.get("stored_filename", ""))).name

        if not stored_filename:
            continue

        path = UPLOAD_ROOT / project_id / stored_filename

        if path.exists():
            candidates.append((item, path))

    return candidates


def extract_best_quote_text(
    project_id: str,
    evidence: list[dict[str, Any]],
) -> tuple[dict[str, Any], Path, ExtractedText]:
    candidates = get_quote_candidates(project_id, evidence)

    if not candidates:
        raise QuoteCheckInputError(
            "Aucun devis PDF ou image n'a été trouvé dans les documents du projet.",
            ["quote_file"],
        )

    best: tuple[dict[str, Any], Path, ExtractedText] | None = None
    best_score = -1
    errors: list[str] = []

    for item, path in candidates:
        try:
            extracted = extract_text_from_file(
                path,
                str(item.get("file_kind", "")),
            )
        except QuoteCheckInputError:
            raise
        except Exception as error:
            errors.append(f"{path.name}: {error}")
            continue

        confidence_score = int((extracted.confidence or 0) * 500)
        score = len(extracted.text) + confidence_score

        if score > best_score:
            best_score = score
            best = (item, path, extracted)

    if best is None:
        raise QuoteCheckInputError(
            "Aucun fichier devis exploitable n'a pu être lu.",
            ["readable_quote_file"],
        )

    quote, path, extracted = best

    if len(extracted.text) < 80:
        raise QuoteCheckInputError(
            "Le devis ne contient pas assez de texte exploitable. Ajoutez un PDF texte ou une photo plus nette.",
            ["extractable_quote_text"],
        )

    return quote, path, extracted


def run_quote_check(
    project_id: str,
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    quote, quote_path, extracted = extract_best_quote_text(
        project_id,
        evidence,
    )

    text = extracted.text
    amounts = find_amounts(text)
    categories = detect_work_categories(text)
    fields = check_required_quote_fields(text, amounts)
    red_flags = detect_red_flags(
        text,
        amounts,
        fields,
        extracted,
    )

    quality_score = compute_quality_score(
        fields,
        red_flags,
        categories,
        extracted,
    )

    authenticity = build_authenticity_assessment(
        text,
        fields,
        amounts,
        red_flags,
    )

    company_identifiers = extract_company_identifiers(text)
    amount_summary = build_amount_summary(amounts)

    official_company_verification = verify_company_identifier(
        siren=company_identifiers.get("siren"),
        siret=company_identifiers.get("siret"),
    )

    company_identifiers["official_verification_status"] = (
        official_company_verification.get("status")
    )
    company_identifiers["official_name"] = (
        official_company_verification.get("official_name")
    )
    company_identifiers["active"] = (
        official_company_verification.get("active")
    )

    if official_company_verification.get("status") == "verified":
        authenticity["score"] = min(
            100,
            int(authenticity.get("score", 0)) + 6,
        )
        authenticity["summary"] = (
            "Le devis paraît structuré et l'entreprise a été trouvée "
            "dans une source officielle. RGE et assurance restent à vérifier."
        )
    elif official_company_verification.get("status") == "not_found":
        authenticity["score"] = max(
            0,
            int(authenticity.get("score", 0)) - 18,
        )
        authenticity["summary"] = (
            "L'entreprise détectée n'a pas été trouvée automatiquement "
            "dans la source officielle. Vérification manuelle nécessaire."
        )

    status = "needs_review"

    if quality_score >= 75 and not any(
        flag["severity"] == "high"
        for flag in red_flags
    ):
        status = "structured"

    if quality_score < 45:
        status = "weak_quote"

    return {
        "status": status,
        "generated_at": utc_now_iso(),
        "project_id": project_id,
        "quote_file": {
            "evidence_id": quote["id"],
            "filename": quote["original_filename"],
            "file_kind": quote.get("file_kind"),
            "size_bytes": quote["size_bytes"],
            "sha256": quote["sha256"],
        },
        "quality_score": quality_score,
        "authenticity_assessment": authenticity,
        "company_identifiers": company_identifiers,
        "official_company_verification": official_company_verification,
        "amount_summary": amount_summary,
        "detected_amounts": amounts,
        "work_categories": categories,
        "field_checks": fields,
        "red_flags": red_flags,
        "text_extract": {
            "characters": len(text),
            "preview": text[:1000],
            "extraction_method": extracted.method,
            "ocr_confidence": extracted.confidence,
            "pages_or_images": extracted.pages_or_images,
            "warnings": extracted.warnings,
            "source_file": quote["original_filename"],
        },
        "decision": {
            "ready_for_signature": False,
            "human_review_required": True,
            "reason": "Contrôle préliminaire automatique uniquement.",
        },
        "limitations": [
            "ZAMI indique un niveau de risque, pas une preuve définitive fake/authentique.",
            "La lecture OCR peut être imparfaite sur photo floue ou scan de mauvaise qualité.",
            "Les prix ne sont pas comparés à un référentiel marché validé.",
            "Les aides publiques ne sont pas vérifiées.",
            "La qualification RGE, le SIRET et l'assurance doivent être contrôlés avec sources officielles.",
        ],
    }
