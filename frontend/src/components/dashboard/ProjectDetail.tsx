"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Camera, CheckCircle2, FileText, Home, ShieldCheck, WalletCards } from "lucide-react";
import { supabase } from "../../lib/supabase/client";

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
  recommendations: any[];
};

export function ProjectDetail() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single();

      setProject(data as Project);
    }

    load();
  }, [params.id]);

  if (!project) {
    return <div className="mt-8 text-slate-400">Chargement du projet...</div>;
  }

  return (
    <section className="mt-8 rounded-[36px] border border-white/10 bg-slate-950/70 p-8">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">
        Dossier logement
      </p>

      <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">
        {project.address}
      </h1>

      <div className="mt-10 grid gap-5 md:grid-cols-4">
        <Metric icon={<Home />} label="Surface" value={`${project.surface} m²`} />
        <Metric icon={<ShieldCheck />} label="DPE" value={`${project.dpe} → ${project.target_dpe}`} />
        <Metric icon={<WalletCards />} label="Budget" value={`${Number(project.estimated_cost).toLocaleString("fr-FR")}€`} />
        <Metric icon={<FileText />} label="Aides" value={`${Number(project.subsidies).toLocaleString("fr-FR")}€`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Travaux recommandés">
          {(project.recommendations ?? []).map((rec) => (
            <div key={rec.title} className="mb-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs font-bold text-emerald-400">{rec.priority}</p>
              <p className="mt-1 font-black text-white">{rec.title}</p>
              <p className="mt-2 text-sm text-slate-400">{rec.impact}</p>
            </div>
          ))}
        </Panel>

        <Panel title="Timeline">
          {["Estimation créée", "Inspection à planifier", "Devis en attente", "Travaux à venir"].map((item, i) => (
            <div key={item} className="mb-3 flex gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <CheckCircle2 className={`h-5 w-5 ${i === 0 ? "text-emerald-400" : "text-slate-600"}`} />
              <p className="font-black text-white">{item}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-2xl font-black text-white">Photos chantier</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex h-32 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70">
              <Camera className="h-8 w-8 text-emerald-400" />
            </div>
          ))}
        </div>
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
