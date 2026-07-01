import {
  Brain,
  Camera,
  ClipboardCheck,
  Hammer,
  ShieldCheck,
  Home,
  ChevronRight,
} from "lucide-react";

const steps = [
  {
    icon: Brain,
    title: "Estimation IA",
    text: "Analyse du logement en quelques secondes.",
  },
  {
    icon: Camera,
    title: "Inspection",
    text: "Visite technique avec photos et mesures.",
  },
  {
    icon: ClipboardCheck,
    title: "Plan de rénovation",
    text: "Scénario optimisé + aides financières.",
  },
  {
    icon: Hammer,
    title: "Travaux",
    text: "Suivi quotidien du chantier.",
  },
  {
    icon: ShieldCheck,
    title: "Contrôle qualité",
    text: "Chaque étape est validée.",
  },
  {
    icon: Home,
    title: "Livraison",
    text: "Passeport numérique du logement.",
  },
];

export function Timeline() {
  return (
    <section
      id="fonctionnement"
      className="px-4 py-28"
    >
      <div className="mx-auto max-w-[1350px]">

        <div className="max-w-3xl">
          <p className="text-emerald-400 font-black uppercase tracking-[0.2em]">
            Comment fonctionne ZAMI ?
          </p>

          <h2 className="mt-4 text-5xl font-black text-white">
            Une rénovation pensée comme
            <span className="text-emerald-400">
              {" "}une expérience premium.
            </span>
          </h2>

          <p className="mt-6 text-xl text-slate-400 leading-9">
            Nous ne vous mettons pas simplement en relation avec un artisan.
            Nous orchestrons tout le projet.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 transition-all duration-500 hover:-translate-y-3 hover:border-emerald-400/40 hover:bg-white/[0.05]"
              >

                <div className="flex items-center justify-between">

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Icon className="h-8 w-8 text-emerald-400"/>
                  </div>

                  <div className="text-5xl font-black text-white/5">
                    0{index+1}
                  </div>

                </div>

                <h3 className="mt-8 text-2xl font-bold text-white">
                  {step.title}
                </h3>

                <p className="mt-4 leading-8 text-slate-400">
                  {step.text}
                </p>

                <div className="mt-8 flex items-center gap-2 font-semibold text-emerald-400 opacity-0 transition group-hover:opacity-100">
                  Découvrir
                  <ChevronRight className="h-4 w-4"/>
                </div>

              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
