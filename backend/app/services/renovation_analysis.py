from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import xgboost as xgb


BACKEND_ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BACKEND_ROOT
    / "models"
    / "reno_cost_model.json"
)

METADATA_PATH = (
    BACKEND_ROOT
    / "models"
    / "reno_cost_model_metadata.json"
)

FEATURE_NAMES = [
    "surface",
    "dpe_encoded",
    "zipcode",
    "surface_squared",
    "region_code",
]


class AnalysisInputError(Exception):
    def __init__(
        self,
        message: str,
        missing: list[str] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.missing = missing or []


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@lru_cache(maxsize=1)
def load_metadata() -> dict[str, Any]:
    if not METADATA_PATH.exists():
        raise RuntimeError(
            "Les métadonnées du modèle sont absentes."
        )

    return json.loads(
        METADATA_PATH.read_text(encoding="utf-8")
    )


@lru_cache(maxsize=1)
def load_model() -> xgb.Booster:
    if not MODEL_PATH.exists():
        raise RuntimeError(
            "Le modèle de coût est absent."
        )

    booster = xgb.Booster()
    booster.load_model(MODEL_PATH)

    return booster


def to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None

    if isinstance(value, str):
        value = value.strip().replace(",", ".")

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if not np.isfinite(number):
        return None

    return number


def get_dict(
    container: dict[str, Any],
    key: str,
) -> dict[str, Any]:
    value = container.get(key)

    return value if isinstance(value, dict) else {}


def extract_verified_dpe(
    snapshot: dict[str, Any],
) -> tuple[str | None, dict[str, Any]]:
    dpe_point = get_dict(snapshot, "dpe")
    dpe_value = get_dict(dpe_point, "value")

    if dpe_point.get("verified") is not True:
        return None, dpe_value

    if dpe_point.get("status") != "available":
        return None, dpe_value

    energy_class = dpe_value.get("energy_class")

    if not isinstance(energy_class, str):
        return None, dpe_value

    return energy_class.strip().upper(), dpe_value


def extract_surface(
    project: dict[str, Any],
    dpe_value: dict[str, Any],
) -> tuple[float | None, str | None]:
    dpe_surface = to_float(
        dpe_value.get("living_surface_m2")
    )

    if dpe_surface is not None:
        return dpe_surface, "verified_dpe"

    answers = get_dict(project, "answers")

    declared_surface = to_float(
        answers.get("living_surface")
    )

    if declared_surface is not None:
        return declared_surface, "homeowner_declaration"

    return None, None


def extract_postcode(
    project: dict[str, Any],
    snapshot: dict[str, Any],
) -> str | None:
    candidates: list[Any] = []

    address = get_dict(project, "address")
    candidates.append(address.get("postcode"))

    address_point = get_dict(snapshot, "address")
    address_value = get_dict(address_point, "value")

    candidates.append(address_value.get("postcode"))
    candidates.append(project.get("address_label"))

    for candidate in candidates:
        if candidate is None:
            continue

        match = re.search(
            r"\b\d{5}\b",
            str(candidate),
        )

        if match:
            return match.group(0)

    return None


def prepare_model_inputs(
    project: dict[str, Any],
) -> dict[str, Any]:
    snapshot = get_dict(project, "snapshot")
    metadata = load_metadata()

    dpe_class, dpe_value = extract_verified_dpe(
        snapshot
    )

    surface, surface_source = extract_surface(
        project,
        dpe_value,
    )

    postcode = extract_postcode(
        project,
        snapshot,
    )

    missing: list[str] = []

    if surface is None:
        missing.append("living_surface")

    if dpe_class is None:
        missing.append("verified_dpe")

    if postcode is None:
        missing.append("postcode")

    if missing:
        raise AnalysisInputError(
            (
                "Le modèle ne peut pas être exécuté "
                "sans les données obligatoires."
            ),
            missing,
        )

    if surface < 20 or surface > 300:
        raise AnalysisInputError(
            (
                "La surface doit être comprise entre "
                "20 et 300 m²."
            ),
            ["supported_surface"],
        )

    dpe_encoding = metadata.get(
        "dpe_encoding",
        {},
    )

    if dpe_class not in dpe_encoding:
        raise AnalysisInputError(
            (
                "Le modèle expérimental accepte uniquement "
                "les classes D, E, F et G."
            ),
            ["supported_dpe_class"],
        )

    zipcode = int(postcode)
    region_code = zipcode // 1000

    return {
        "surface": float(surface),
        "surface_source": surface_source,
        "dpe_class": dpe_class,
        "dpe_encoded": int(
            dpe_encoding[dpe_class]
        ),
        "postcode": postcode,
        "zipcode": zipcode,
        "surface_squared": float(surface**2),
        "region_code": region_code,
    }


def run_renovation_analysis(
    project: dict[str, Any],
) -> dict[str, Any]:
    model_inputs = prepare_model_inputs(project)

    metadata = load_metadata()
    booster = load_model()

    values = np.asarray(
        [
            [
                model_inputs["surface"],
                model_inputs["dpe_encoded"],
                model_inputs["zipcode"],
                model_inputs["surface_squared"],
                model_inputs["region_code"],
            ]
        ],
        dtype=np.float32,
    )

    matrix = xgb.DMatrix(
        values,
        feature_names=FEATURE_NAMES,
    )

    prediction = float(
        booster.predict(matrix)[0]
    )

    if not np.isfinite(prediction):
        raise RuntimeError(
            "Le modèle a retourné une valeur invalide."
        )

    central_cost = max(
        0,
        int(round(prediction / 100) * 100),
    )

    confidence = "low"

    warnings = [
        (
            "Cette estimation expérimentale ne constitue "
            "pas un devis professionnel."
        ),
        (
            "Aucune métrique de validation documentée "
            "n'est disponible pour ce modèle."
        ),
        (
            "Les aides, économies d'énergie et gains de "
            "valeur immobilière ne sont pas confirmés."
        ),
        (
            "Une visite technique et plusieurs devis "
            "professionnels restent nécessaires."
        ),
    ]

    if (
        model_inputs["surface"] < 35
        or model_inputs["surface"] > 110
    ):
        confidence = "very_low"

        warnings.append(
            (
                "La surface est hors des principales "
                "bornes observées dans le modèle."
            )
        )

    return {
        "status": "experimental",
        "generated_at": utc_now_iso(),
        "project_id": project["id"],
        "estimate": {
            "central_cost_eur": central_cost,
            "currency": "EUR",
            "estimate_type": (
                "machine_learning_indicative"
            ),
            "display_label": (
                "Estimation indicative expérimentale"
            ),
            "is_quote": False,
            "is_confidence_interval": False,
        },
        "confidence": confidence,
        "inputs": {
            "surface_m2": model_inputs["surface"],
            "surface_source": (
                model_inputs["surface_source"]
            ),
            "verified_dpe_class": (
                model_inputs["dpe_class"]
            ),
            "postcode": model_inputs["postcode"],
            "region_code": (
                model_inputs["region_code"]
            ),
        },
        "model": {
            "name": metadata["model_name"],
            "version": metadata["model_version"],
            "production_status": (
                metadata["production_status"]
            ),
            "feature_names": FEATURE_NAMES,
            "validation_metrics_available": False,
        },
        "warnings": warnings,
        "next_required_step": (
            "Obtenir plusieurs devis après une visite technique."
        ),
    }
