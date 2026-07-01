"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeEuro,
  Camera,
  Check,
  Home,
  Play,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Zap,
} from "lucide-react";
import CountUp from "react-countup";
import { Button } from "./ui/Button";

const pills = ["Estimation IA", "Inspection terrain", "Suivi chantier", "Paiement sécurisé"];

const floatingCards = [
  { icon: ThermometerSun, label: "Pompe à chaleur", className: "left-0 top-16" },
  { icon: ShieldCheck, label: "Qualité vérifiée", className: "right-0 top-20" },
  { icon: Camera, label: "Photos chantier", className: "left-8 bottom-24" },
  { icon: BadgeEuro, label: "Aides détectées", className: "right-8 bottom-28" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-14 lg:pb-32 lg:pt-20">
      <div className="absolute left-1/2 top-0 -z-10 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[150px]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(circle_at_70%_20%,rgba(34,197,94,.22),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(243,210,122,.08),transparent_28%)]" />

      <div className="mx-auto grid max-w-[1340px] items-center gap-16 lg:grid-cols-[1.02fr_.98fr]">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(34,197,94,.9)]" />
            Bêta en Île-de-France
          </div>

          <p className="mt-8 text-sm font-black uppercase tracking-[0.25em] text-emerald-400">
            AI Renovation Operating System
          </p>

          <h1 className="mt-6 max-w-[820px] text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:text-[82px]">
            Rénover sans stress,
            <span className="block bg-gradient-to-r from-emerald-200 via-emerald-400 to-green-500 bg-clip-text text-transparent">
              avec ZAMI aux commandes.
            </span>
          </h1>

          <p className="mt-7 max-w-[710px] text-lg leading-8 text-slate-300 sm:text-xl">
            ZAMI transforme votre rénovation énergétique en parcours clair :
            estimation IA, inspection terrain, suivi quotidien, contrôle qualité
            et historique complet du logement.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-200 backdrop-blur"
              >
                {pill}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href="/estimate">
              <span className="flex items-center gap-2">
                Obtenir mon estimation gratuite
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>

            <Button href="#fonctionnement" variant="secondary">
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Voir le fonctionnement
              </span>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
            {["Gratuit", "Sans engagement", "Devis final après visite"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative min-h-[640px]"
        >
          <div className="absolute inset-0 rounded-[44px] border border-white/10 bg-gradient-to-br from-slate-950 via-[#062016] to-slate-950 shadow-[0_50px_150px_rgba(0,0,0,.65)]" />
          <div className="absolute inset-0 rounded-[44px] bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,.25),transparent_34%)]" />

          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-24 flex h-72 w-72 -translate-x-1/2 items-center justify-center rounded-[56px] border border-emerald-400/30 bg-emerald-400/10 shadow-[0_40px_120px_rgba(34,197,94,.25)] backdrop-blur-2xl"
          >
            <Home className="h-32 w-32 text-emerald-300" />
            <div className="absolute -bottom-9 rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-3 text-center backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Score logement
              </p>
              <p className="text-3xl font-black text-emerald-400">82/100</p>
            </div>
          </motion.div>

          {floatingCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4 + index,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute ${card.className} z-20 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-2xl backdrop-blur-xl`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">{card.label}</span>
                </div>
              </motion.div>
            );
          })}

          <div className="absolute bottom-8 left-8 right-8 grid gap-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Analyse IA en cours</p>
                  <p className="mt-1 text-xs text-slate-500">Budget · Aides · DPE · Qualité</p>
                </div>
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "78%" }}
                  transition={{ duration: 2.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Zap className="h-5 w-5 text-emerald-400" />
                <p className="mt-3 text-xs text-slate-500">Économie/an</p>
                <p className="text-xl font-black text-white">
                  <CountUp end={2400} separator=" " />€
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <BadgeEuro className="h-5 w-5 text-emerald-400" />
                <p className="mt-3 text-xs text-slate-500">Aides</p>
                <p className="text-xl font-black text-white">
                  <CountUp end={8400} separator=" " />€
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <p className="mt-3 text-xs text-slate-500">Qualité</p>
                <p className="text-xl font-black text-white">9.2/10</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
