import Link from "next/link";

export function ZamiShell({
  children,
  active = "Accueil",
}: {
  children: React.ReactNode;
  active?: string;
}) {
  const nav = [
    ["Accueil", "/"],
    ["Estimation IA", "/estimate"],
    ["Mes projets", "/dashboard"],
    ["Rapport", "/report"],
  ];

  return (
    <main className="min-h-screen">
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between rounded-full border border-white/10 bg-slate-950/70 px-5 py-3 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,.45)]">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-[0_0_35px_rgba(34,197,94,.45)]" />
            <span className="text-2xl font-black text-white">ZAMI</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {nav.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active === label
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <Link
            href="/estimate"
            className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-[0_15px_45px_rgba(34,197,94,.35)]"
          >
            Commencer
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-28">{children}</div>
    </main>
  );
}
