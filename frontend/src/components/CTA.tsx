import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "./ui/Button";
import { GlassCard } from "./ui/GlassCard";

export function CTA() {
  return (
    <section id="confiance" className="px-4 py-28">
      <div className="mx-auto max-w-[1340px]">
        <div className="grid gap-8 rounded-[36px] border border-emerald-400/20 bg-gradient-to-br from-slate-950 via-[#062016] to-slate-950 p-8 shadow-[0_40px_120px_rgba(0,0,0,.55)] md:grid-cols-[1.1fr_.9fr] md:p-12">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-400">
              Simple · Sûr · Transparent
            </p>

            <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
              Prêt à estimer votre projet ?
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Obtenez une première estimation en 2 minutes. Aucune carte
              bancaire requise. Le devis final reste confirmé après visite
              technique.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/estimate">
                <span className="flex items-center gap-2">
                  Commencer maintenant
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>

              <Button href="/contact" variant="secondary">
                Parler à ZAMI
              </Button>
            </div>
          </div>

          <GlassCard>
            <div className="space-y-5">
              <div className="flex gap-4">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="font-black text-white">Partenaires vérifiés</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Sélection progressive d’artisans qualifiés.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Lock className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="font-black text-white">Données sécurisées</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Adresse, documents et projet protégés.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Sparkles className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="font-black text-white">Bêta honnête</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Estimation indicative, visite avant devis final.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
