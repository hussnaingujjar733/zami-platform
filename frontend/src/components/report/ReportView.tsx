"use client";

import { useEffect, useState } from "react";
import { FileText, ShieldCheck, Sparkles } from "lucide-react";
import type { EstimateResponse } from "../../types/property";

export function ReportView() {
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("zami_last_estimate");
    if (saved) setEstimate(JSON.parse(saved));
  }, []);

  const budget = estimate?.estimatedCost ?? 32000;
  const subsidies = estimate?.subsidies ?? 8400;
  const netCost = estimate?.netCost ?? budget - subsidies;
  const dpe = estimate?.dpe ?? "E";
  const target = estimate?.targetDpe ?? "B";
  const surface = estimate?.surface ?? 75;
  const address = estimate?.address ?? "Adresse non renseignée";

  return (
    <section className="rounded-[28px] border border-slate-200 p-10">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
          <Sparkles className="h-6 w-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-4xl font-black">ZAMI</h1>
          <p className="text-slate-500">Rapport indicatif de rénovation énergétique</p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl bg-slate-50 p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Résumé du logement
        </p>
        <h2 className="mt-3 text-3xl font-black">{address}</h2>
        <p className="mt-3 leading-7 text-slate-600">
          Surface: <b>{surface} m²</b> · DPE actuel: <b>{dpe}</b> · DPE cible: <b>{target}</b>
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Card title="Budget estimé" value={`${budget.toLocaleString("fr-FR")}€`} />
        <Card title="Aides possibles" value={`${subsidies.toLocaleString("fr-FR")}€`} />
        <Card title="Reste à charge" value={`${netCost.toLocaleString("fr-FR")}€`} />
        <Card title="DPE cible" value={target} />
      </div>

      <div className="mt-10">
        <h3 className="text-2xl font-black">Travaux recommandés</h3>
        <div className="mt-5 space-y-4">
          {(estimate?.recommendations ?? []).map((item) => (
            <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-200 p-5">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-black">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.impact}</p>
                <p className="mt-2 text-sm">
                  Coût indicatif: <b>{item.cost.toLocaleString("fr-FR")}€</b>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
        {estimate?.note ?? "Estimation indicative. Devis final après visite technique."}
      </footer>
    </section>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <FileText className="h-5 w-5 text-emerald-700" />
      <p className="mt-4 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
