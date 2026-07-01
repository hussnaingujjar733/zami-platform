import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { NAV_ITEMS } from "../lib/constants";
import { Button } from "./ui/Button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <nav className="mx-auto flex max-w-[1340px] items-center justify-between rounded-[22px] border border-white/10 bg-slate-950/75 px-5 py-4 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>

          <div>
            <div className="text-xl font-black tracking-[-0.04em] text-white">
              ZAMI
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Rénovation intelligente
            </div>
          </div>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-300 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button href="/login" variant="secondary">
            Se connecter
          </Button>

          <Button href="/estimate">Estimation gratuite</Button>
        </div>

        <button
          type="button"
          aria-label="Ouvrir le menu"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>
    </header>
  );
}
