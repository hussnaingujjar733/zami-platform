import {
  AlertTriangle,
  Camera,
  FileText,
  HandCoins,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SectionTitle } from "./ui/SectionTitle";
import { GlassCard } from "./ui/GlassCard";

const fears = [
  {
    icon: AlertTriangle,
    title: "Devis flous",
    text: "Difficile de savoir si le prix est juste.",
  },
  {
    icon: HandCoins,
    title: "Aides compliquées",
    text: "Les subventions sont difficiles à comprendre.",
  },
  {
    icon: Camera,
    title: "Suivi invisible",
    text: "Peu de visibilité sur l’avancement réel.",
  },
  {
    icon: ShieldCheck,
    title: "Qualité incertaine",
    text: "Impossible de contrôler chaque étape seul.",
  },
];

const solutions = [
  {
    icon: Sparkles,
    title: "Décision plus claire",
    text: "ZAMI analyse le coût, le DPE, les risques et les priorités.",
  },
  {
    icon: Camera,
    title: "Suivi rassurant",
    text: "Photos, avancement et alertes dans votre espace propriétaire.",
  },
  {
    icon: ShieldCheck,
    title: "Moins de surprises",
    text: "Les étapes importantes sont vérifiées avant validation.",
  },
  {
    icon: FileText,
    title: "Mémoire du logement",
    text: "Rapports, factures, garanties et historique conservés.",
  },
];

export function Features() {
  return (
    <section id="proprietaires" className="px-4 py-28">
      <div className="mx-auto max-w-[1340px]">
        <SectionTitle
          eyebrow="Le vrai problème"
          title="Pourquoi rénover fait peur ?"
          subtitle="ZAMI part des vrais problèmes des propriétaires : manque de confiance, devis flous, aides compliquées et peur de mal choisir."
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {fears.map((item) => {
            const Icon = item.icon;

            return (
              <GlassCard key={item.title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                  <Icon className="h-6 w-6 text-red-300" />
                </div>

                <h3 className="mt-6 text-xl font-black text-white">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-400">{item.text}</p>
              </GlassCard>
            );
          })}
        </div>

        <div className="mt-24">
          <SectionTitle
            eyebrow="La réponse ZAMI"
            title="Un parcours clair, suivi et sécurisé."
            subtitle="Un seul espace pour comprendre, décider, suivre et sécuriser votre rénovation."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {solutions.map((item) => {
              const Icon = item.icon;

              return (
                <GlassCard key={item.title}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10">
                    <Icon className="h-6 w-6 text-emerald-400" />
                  </div>

                  <h3 className="mt-6 text-xl font-black text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    {item.text}
                  </p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
