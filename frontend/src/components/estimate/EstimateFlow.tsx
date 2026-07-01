"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  CheckCircle2,
  Download,
  FileText,
  Home,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { searchAddress } from "../../lib/api/address";
import { getEstimate } from "../../lib/api/estimate";
import type { AddressSuggestion, EstimateResponse } from "../../types/property";

export function EstimateFlow() {
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [surface, setSurface] = useState("");
  const [propertyType, setPropertyType] = useState("Appartement");
  const [result, setResult] = useState<EstimateResponse | null>(null);

  async function handleAddressChange(value: string) {
    setAddress(value);
    if (value.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const data = await searchAddress(value);
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
  }

  async function startAnalysis() {
    if (!address.trim()) return;
    try {
      setStatus("loading");
      setSuggestions([]);
      const data = await getEstimate(
        address,
        surface ? Number(surface) : undefined,
        propertyType
      );
      setResult(data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-10">
      <div className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <label className="text-sm font-bold text-slate-300">Adresse du logement</label>

        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-4">
            <MapPin className="h-5 w-5 text-emerald-400" />
            <input
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="Ex: 39 Rue du Sergent Bobillot, 93100 Montreuil"
              className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={startAnalysis}
            disabled={!address.trim() || status === "loading"}
            className="rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white shadow-[0_18px_55px_rgba(34,197,94,.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Analyse..." : "Analyser →"}
          </button>
        </div>

        {suggestions.length > 0 && (
          <div className="absolute left-5 right-5 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
            {suggestions.map((item) => (
              <button
                key={`${item.label}-${item.postcode}`}
                onClick={() => {
                  setAddress(`${item.label}, ${item.postcode} ${item.city}`);
                  setSuggestions([]);
                }}
                className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5"
              >
                <strong className="text-white">{item.label}</strong>
                <br />
                {item.postcode} {item.city}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
          <label className="text-xs font-bold text-slate-500">Surface connue ?</label>
          <input
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            type="number"
            placeholder="Ex: 75"
            className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
          <label className="text-xs font-bold text-slate-500">Type de logement</label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="mt-2 w-full bg-transparent text-white outline-none"
          >
            <option className="bg-slate-950">Appartement</option>
            <option className="bg-slate-950">Maison</option>
          </select>
        </div>
      </div>

      {status === "loading" && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-8 rounded-[28px] border border-emerald-400/20 bg-emerald-400/5 p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <p className="font-black text-white">ZAMI analyse votre projet...</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {["Recherche BAN", "Analyse ADEME", "Calcul budget", "Estimation aides", "ROI", "Plan travaux"].map((step) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                {step}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {status === "error" && (
        <div className="mt-8 rounded-[28px] border border-red-400/20 bg-red-400/5 p-6 text-red-200">
          Erreur API. Vérifie que le backend FastAPI tourne sur le port 8000.
        </div>
      )}

      {status === "done" && result && (
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 to-white/[0.03] p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">Résultat ZAMI</p>
            <h2 className="mt-3 text-3xl font-black text-white">Première analyse énergétique prête</h2>
            <p className="mt-3 text-slate-400">{result.address}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <Metric icon={<Sparkles />} label="Budget estimé" value={<><CountUp end={result.estimatedCost} separator=" " />€</>} sub={`≈ ${Math.round(result.estimatedCost / result.surface)}€/m²`} />
              <Metric icon={<ShieldCheck />} label="Aides possibles" value={<><CountUp end={result.subsidies} separator=" " />€</>} sub="Selon éligibilité" />
              <Metric icon={<TrendingUp />} label="Reste à charge" value={<><CountUp end={result.netCost} separator=" " />€</>} sub={`${result.paybackYears} ans retour`} />
              <Metric icon={<Home />} label="DPE" value={`${result.dpe} → ${result.targetDpe}`} sub={result.source.includes("ADEME") ? "ADEME trouvé" : "Estimé"} />
              <Metric icon={<FileText />} label="Valeur potentielle" value={<><CountUp end={result.estimatedValueGain} separator=" " />€</>} sub="gain indicatif" />
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">
              Surface détectée : <span className="font-bold text-white">{result.surface} m²</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Niveau de fiabilité : <span className="font-bold text-emerald-400">{result.confidence}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">{result.note}</p>
          </div>

          <div className="mt-8 rounded-[28px] border border-emerald-400/20 bg-emerald-400/5 p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">Analyse IA</p>
            <h3 className="mt-3 text-2xl font-black text-white">Travaux recommandés</h3>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {result.recommendations.map((rec) => (
                <div key={rec.title} className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
                  <p className="text-xs font-bold text-emerald-400">{rec.priority}</p>
                  <h4 className="mt-2 text-lg font-black text-white">{rec.title}</h4>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{rec.impact}</p>
                  <p className="mt-4 text-sm text-slate-500">
                    Coût indicatif : <span className="font-black text-white">{rec.cost.toLocaleString("fr-FR")}€</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <button className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white shadow-[0_18px_55px_rgba(34,197,94,.35)]">
              <Download className="h-5 w-5" />
              <a href="/report">Télécharger le rapport IA</a>
            </button>
            <button className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 font-black text-white">
              <a href="/dashboard">Créer mon espace propriétaire</a>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
      <div className="h-6 w-6 text-emerald-400">{icon}</div>
      <p className="mt-5 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{sub}</p>
    </div>
  );
}
