from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import re

app = FastAPI(title="ZAMI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EstimateRequest(BaseModel):
    address: str
    surface: float | None = None
    propertyType: str | None = None

@app.get("/")
def root():
    return {"status": "ok", "service": "ZAMI API"}

@app.get("/address/search")
def address_search(q: str):
    if len(q.strip()) < 3:
        return []
    try:
        r = requests.get("https://api-adresse.data.gouv.fr/search/", params={"q": q, "limit": 5}, timeout=8)
        r.raise_for_status()
        data = r.json()
        return [{
            "label": f["properties"].get("label", ""),
            "city": f["properties"].get("city", ""),
            "postcode": f["properties"].get("postcode", ""),
            "lat": f["geometry"]["coordinates"][1],
            "lon": f["geometry"]["coordinates"][0],
        } for f in data.get("features", [])]
    except Exception:
        return []

def extract_postcode(address: str):
    match = re.search(r"\b\d{5}\b", address)
    return match.group(0) if match else ""

def dpe_lookup(address: str):
    try:
        r = requests.get(
            "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines",
            params={
                "q": address,
                "size": 1,
                "select": "etiquette_dpe,conso_5_usages_ef,surface_habitable_logement,annee_construction,nom_commune_ban,code_postal_ban",
            },
            timeout=10,
        )
        r.raise_for_status()
        results = r.json().get("results", [])
        if not results:
            return None
        item = results[0]
        return {
            "dpe": item.get("etiquette_dpe"),
            "consumption": item.get("conso_5_usages_ef"),
            "surface": item.get("surface_habitable_logement"),
            "year": item.get("annee_construction"),
            "source": "ADEME",
        }
    except Exception:
        return None

@app.post("/estimate")
def estimate(data: EstimateRequest):
    postcode = extract_postcode(data.address)
    dpe_data = dpe_lookup(data.address)

    if dpe_data:
        dpe = dpe_data.get("dpe") or "Non trouvé"
        surface = float(data.surface or dpe_data.get("surface") or 75)

        if surface < 25 or surface > 300:
            surface = 75
            confidence = "faible"
            source = "ADEME trouvé mais surface non fiable"
        else:
            confidence = "moyenne"
            source = "ADEME"
    else:
        dpe = "Non trouvé"
        surface = float(data.surface or 75)
        confidence = "faible"
        source = "estimation indicative"

    estimated_cost = int(surface * 420)
    subsidies = int(estimated_cost * 0.22)
    yearly_savings = int(surface * 28)

    recommendations = []

    if dpe in ["E", "F", "G", "Non trouvé"]:
        recommendations = [
            {
                "title": "Isolation des combles",
                "priority": "Priorité élevée",
                "impact": "Réduction forte des pertes thermiques",
                "cost": int(surface * 90),
            },
            {
                "title": "Pompe à chaleur",
                "priority": "Priorité moyenne",
                "impact": "Baisse importante de la facture énergétique",
                "cost": int(surface * 180),
            },
            {
                "title": "Fenêtres double vitrage",
                "priority": "Confort",
                "impact": "Meilleur confort thermique et acoustique",
                "cost": int(surface * 120),
            },
        ]
    else:
        recommendations = [
            {
                "title": "Optimisation du chauffage",
                "priority": "Priorité moyenne",
                "impact": "Amélioration du rendement énergétique",
                "cost": int(surface * 120),
            },
            {
                "title": "Ventilation",
                "priority": "Confort",
                "impact": "Meilleure qualité d’air et humidité réduite",
                "cost": int(surface * 60),
            },
            {
                "title": "Isolation ciblée",
                "priority": "À vérifier",
                "impact": "Travaux localisés après inspection",
                "cost": int(surface * 80),
            },
        ]

    return {
        "address": data.address,
        "postcode": postcode,
        "dpe": dpe,
        "surface": surface,
        "estimatedCost": estimated_cost,
        "subsidies": subsidies,
        "yearlySavings": yearly_savings,
        "netCost": max(estimated_cost - subsidies, 0),
        "paybackYears": round(max(estimated_cost - subsidies, 1) / max(yearly_savings, 1), 1),
        "targetDpe": "B" if dpe in ["E", "F", "G", "Non trouvé"] else "A",
        "estimatedValueGain": int(estimated_cost * 0.18),
        "netCost": max(estimated_cost - subsidies, 0),
        "paybackYears": round(max(estimated_cost - subsidies, 1) / max(yearly_savings, 1), 1),
        "confidence": confidence,
        "source": source,
        "note": "Estimation indicative. Devis final après visite technique.",
        "recommendations": recommendations,
    }

class ChatRequest(BaseModel):
    question: str
    context: dict | None = None

@app.post("/chat")
def chat(data: ChatRequest):
    q = data.question.lower()
    ctx = data.context or {}

    if "budget" in q or "coût" in q or "prix" in q:
        answer = "Le budget est une première estimation basée sur la surface, le DPE détecté et un coût moyen par m². Il doit être confirmé après inspection terrain."
    elif "aide" in q or "subvention" in q or "maprime" in q:
        answer = "Les aides sont indicatives. L’éligibilité dépend de vos revenus, du type de travaux, du logement et des artisans RGE."
    elif "dpe" in q:
        answer = "Le DPE affiché vient des données disponibles ou d’une estimation. Une visite technique permet de confirmer la classe énergétique réelle."
    elif "prochaine" in q or "étape" in q:
        answer = "La prochaine étape recommandée est de planifier une inspection ZAMI pour vérifier la surface, les photos, le DPE et les travaux prioritaires."
    else:
        answer = "ZAMI recommande de commencer par vérifier la surface, le DPE et les priorités travaux avant de demander un devis final."

    return {"answer": answer}
