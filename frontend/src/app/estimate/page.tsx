import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { EstimateFlow } from "../../components/estimate/EstimateFlow";

export default function EstimatePage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-[980px]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Retour à l’accueil
        </Link>

        <section className="mt-8 rounded-[36px] border border-white/10 bg-slate-950/70 p-8 shadow-[0_40px_120px_rgba(0,0,0,.55)] backdrop-blur-xl md:p-12">
          <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-200">
            <Sparkles className="mr-2 h-4 w-4" />
            Estimation IA gratuite
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-[-0.04em] text-white md:text-6xl">
            Commençons par votre adresse.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            ZAMI utilise votre adresse pour préparer une première estimation indicative.
            Le devis final reste confirmé après visite technique.
          </p>

          <EstimateFlow />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Adresse privée", "Aucune carte bancaire", "Estimation indicative"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-bold text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
