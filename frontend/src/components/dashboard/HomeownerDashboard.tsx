"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, FileText, Home, ShieldCheck, WalletCards } from "lucide-react";
import { getMyProjects } from "../../lib/supabase/projects";

type Project = {
  id: string;
  address: string;
  surface: number;
  dpe: string;
  target_dpe: string;
  estimated_cost: number;
  subsidies: number;
  net_cost: number;
  yearly_savings: number;
  created_at: string;
};

export function HomeownerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getMyProjects();
      setProjects(data as Project[]);
      setSelected((data?.[0] as Project) ?? null);
    }
    load();
  }, []);

  if (!selected) {
    return (
      <section className="mt-8 rounded-[36px] border border-white/10 bg-slate-950/70 p-8">
        <h1 className="text-4xl font-black text-white">Aucun projet sauvegardé</h1>
        <p className="mt-4 text-slate-400">Créez une estimation pour voir votre projet ici.</p>
        <a href="/estimate" className="mt-6 inline-block rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white">
          Créer une estimation
        </a>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[36px] border border-white/10 bg-slate-950/70 p-8 shadow-[0_40px_120px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">Espace propriétaire</p>
      <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">Mes projets ZAMI</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={`rounded-2xl border p-4 text-left ${
              selected.id === p.id ? "border-emerald-400/50 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <p className="font-black text-white">{p.address}</p>
            <p className="mt-2 text-sm text-slate-500">DPE {p.dpe} → {p.target_dpe}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-4">
        <Metric icon={<Home />} label="Surface" value={`${selected.surface} m²`} />
        <Metric icon={<ShieldCheck />} label="DPE" value={`${selected.dpe} → ${selected.target_dpe}`} />
        <Metric icon={<WalletCards />} label="Budget" value={`${Number(selected.estimated_cost).toLocaleString("fr-FR")}€`} />
        <Metric icon={<FileText />} label="Aides" value={`${Number(selected.subsidies).toLocaleString("fr-FR")}€`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Timeline du projet">
          {[
            ["Estimation IA créée", "Projet sauvegardé dans Supabase", true],
            ["Inspection ZAMI", "À planifier", false],
            ["Devis partenaire", "En attente", false],
            ["Travaux", "À venir", false],
          ].map(([title, desc, done]) => (
            <div key={title as string} className="mb-3 flex gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <CheckCircle2 className={`h-5 w-5 ${done ? "text-emerald-400" : "text-slate-600"}`} />
              <div>
                <p className="font-black text-white">{title}</p>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Photos chantier">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-32 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70">
                <Camera className="h-8 w-8 text-emerald-400" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6"><h2 className="mb-6 text-2xl font-black text-white">{title}</h2>{children}</div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5"><div className="h-6 w-6 text-emerald-400">{icon}</div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>;
}
