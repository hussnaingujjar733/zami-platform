"use client";

import { useEffect, useState } from "react";
import {
  Bot, Camera, CheckCircle2, Clock, Download, FileText,
  Home, MessageSquare, ShieldCheck, WalletCards
} from "lucide-react";
import type { EstimateResponse } from "../../types/property";
import { askZami as askZamiApi } from "../../lib/api/chat";

export function HomeownerDashboard() {
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<string[]>([
    "Bonjour, je suis votre assistant ZAMI. Je peux expliquer votre budget, les aides, le DPE et les prochaines étapes."
  ]);

  async function askZami() {
    if (!question.trim()) return;

    const currentQuestion = question;
    setMessages((prev) => [...prev, `Vous: ${currentQuestion}`]);
    setQuestion("");

    try {
      const res = await askZamiApi(currentQuestion, estimate);
      setMessages((prev) => [...prev, `ZAMI: ${res.answer}`]);
    } catch {
      setMessages((prev) => [...prev, "ZAMI: Erreur de connexion API."]);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("zami_last_estimate");
    if (saved) setEstimate(JSON.parse(saved));
  }, []);

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const urls = files.map((file) => URL.createObjectURL(file));
    setPhotos((prev) => [...prev, ...urls]);
  }

  const budget = estimate?.estimatedCost ?? 32000;
  const dpe = estimate?.dpe ?? "E";
  const target = estimate?.targetDpe ?? "B";
  const surface = estimate?.surface ?? 75;
  const address = estimate?.address ?? "Projet rénovation énergétique";

  return (
    <section className="mt-8 rounded-[36px] border border-white/10 bg-slate-950/70 p-8 shadow-[0_40px_120px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">Espace propriétaire</p>
          <h1 className="mt-3 text-4xl font-black text-white md:text-6xl">Votre rénovation en direct.</h1>
          <p className="mt-4 max-w-2xl text-slate-400">{address}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 font-black text-emerald-200">Projet en cours</div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-4">
        <Metric icon={<Home />} label="Surface" value={`${surface} m²`} sub="donnée projet" />
        <Metric icon={<ShieldCheck />} label="DPE" value={`${dpe} → ${target}`} sub="objectif indicatif" />
        <Metric icon={<WalletCards />} label="Budget" value={`${budget.toLocaleString("fr-FR")}€`} sub="fourchette estimée" />
        <Metric icon={<FileText />} label="Documents" value="6" sub="rapport, devis, photos" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <Panel title="Timeline du projet">
          <div className="space-y-4">
            {[
              ["Estimation IA créée", "Analyse préliminaire disponible", true],
              ["Inspection ZAMI", "À planifier", false],
              ["Devis partenaire", "En attente", false],
              ["Travaux", "À venir", false],
              ["Contrôle qualité", "À venir", false],
            ].map(([title, desc, done]) => (
              <div key={title as string} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <CheckCircle2 className={`h-5 w-5 ${done ? "text-emerald-400" : "text-slate-600"}`} />
                <div>
                  <p className="font-black text-white">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Assistant IA">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <Bot className="h-7 w-7 text-emerald-400" />
            <p className="mt-4 font-black text-white">Prochaine action recommandée</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Planifier une visite technique pour vérifier la surface, le DPE et confirmer le devis final.
            </p>
          </div>
          <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            {messages.map((msg, i) => (
              <p key={i} className="text-sm leading-6 text-slate-300">{msg}</p>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: pourquoi ce budget ?"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-600"
            />
            <button onClick={askZami} className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-white">
              <MessageSquare className="h-5 w-5" />
            </button>
          </div>
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="Photos chantier">
          <div className="grid grid-cols-2 gap-3">
            {photos.length === 0 && [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex h-32 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70">
                <Camera className="h-8 w-8 text-emerald-400" />
              </div>
            ))}

            {photos.map((src) => (
              <img key={src} src={src} alt="Photo chantier" className="h-32 w-full rounded-2xl border border-white/10 object-cover" />
            ))}
          </div>

          <label className="mt-6 flex cursor-pointer items-center justify-center rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white">
            Ajouter une photo
            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>

          {photos.length > 0 && (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="font-black text-white">Analyse IA photo</p>
              <p className="mt-2 text-sm text-slate-400">
                {photos.length} photo(s) reçue(s). Qualité visuelle indicative : <span className="font-black text-emerald-400">bonne</span>
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Documents">
          {["Rapport IA", "Devis estimatif", "Photos inspection", "Historique logement"].map((doc) => (
            <div key={doc} className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span className="font-bold text-white">{doc}</span>
              </div>
              <a href="/report"><Download className="h-5 w-5 text-slate-500" /></a>
            </div>
          ))}
        </Panel>

        <Panel title="Paiement sécurisé">
          <WalletCards className="h-7 w-7 text-emerald-400" />
          <p className="mt-4 text-sm text-slate-500">Statut</p>
          <p className="text-xl font-black text-white">Non démarré</p>
          <p className="mt-3 text-sm leading-6 text-slate-400">Disponible après validation du devis final.</p>
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Déblocage après validation qualité
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6"><h2 className="mb-6 text-2xl font-black text-white">{title}</h2>{children}</div>;
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5"><div className="h-6 w-6 text-emerald-400">{icon}</div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p><p className="mt-2 text-sm text-slate-500">{sub}</p></div>;
}
