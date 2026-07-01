"use client";

import { motion } from "framer-motion";
import {
  BatteryCharging,
  Home,
  Leaf,
  ShieldCheck,
  Sun,
  ThermometerSun,
  Wind,
  Zap,
} from "lucide-react";
import { SectionTitle } from "./ui/SectionTitle";

const nodes = [
  { icon: Sun, title: "Toiture solaire", pos: "left-6 top-10" },
  { icon: Wind, title: "Isolation", pos: "right-6 top-16" },
  { icon: ThermometerSun, title: "Pompe à chaleur", pos: "left-2 bottom-20" },
  { icon: BatteryCharging, title: "Énergie", pos: "right-4 bottom-24" },
];

export function HouseExperience() {
  return (
    <section id="technologie" className="relative px-4 py-28">
      <div className="absolute left-1/2 top-20 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />

      <div className="mx-auto max-w-[1340px]">
        <SectionTitle
          eyebrow="Le cœur de ZAMI"
          title="Votre logement devient un projet piloté par données."
          subtitle="ZAMI connecte estimation, inspection, aides, qualité et documents dans une expérience claire pour le propriétaire."
        />

        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            {[
              {
                icon: Zap,
                title: "Analyse énergétique",
                text: "DPE, consommation, économie potentielle et priorités travaux.",
              },
              {
                icon: ShieldCheck,
                title: "Contrôle qualité",
                text: "Photos, étapes et validations centralisées dans votre espace.",
              },
              {
                icon: Leaf,
                title: "Aides & impact",
                text: "Aides possibles, ROI estimatif et amélioration du logement.",
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12 }}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-emerald-400/40"
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10">
                      <Icon className="h-6 w-6 text-emerald-400" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 leading-7 text-slate-400">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative min-h-[520px] rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-950 via-[#062016] to-slate-950 p-8 shadow-[0_45px_130px_rgba(0,0,0,.6)]"
          >
            <div className="absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_50%_35%,rgba(34,197,94,.25),transparent_35%)]" />

            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 mx-auto mt-20 flex h-64 w-64 items-center justify-center rounded-[48px] border border-emerald-400/30 bg-emerald-400/10 shadow-[0_30px_100px_rgba(34,197,94,.25)] backdrop-blur-xl"
            >
              <Home className="h-28 w-28 text-emerald-300" />

              <div className="absolute -bottom-10 rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-3 text-center backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Score logement
                </p>
                <p className="text-3xl font-black text-emerald-400">82/100</p>
              </div>
            </motion.div>

            {nodes.map((node, index) => {
              const Icon = node.icon;

              return (
                <motion.div
                  key={node.title}
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 4 + index,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`absolute ${node.pos} z-20 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-bold text-white">
                      {node.title}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            <div className="absolute bottom-8 left-8 right-8 z-10 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">Économie</p>
                <p className="mt-1 text-xl font-black text-white">2 400€</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">Aides</p>
                <p className="mt-1 text-xl font-black text-white">8 400€</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-slate-500">DPE cible</p>
                <p className="mt-1 text-xl font-black text-white">B</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
