import Link from "next/link";

export function Footer() {
  return (
    <footer id="contact" className="border-t border-white/10 px-4 py-12">
      <div className="mx-auto flex max-w-[1340px] flex-col justify-between gap-8 md:flex-row">
        <div>
          <h3 className="text-2xl font-black text-white">ZAMI</h3>
          <p className="mt-3 max-w-md leading-7 text-slate-400">
            Le copilote de confiance pour votre rénovation énergétique.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-slate-400 sm:grid-cols-2 md:text-right">
          <Link href="/estimate" className="hover:text-white">Estimation</Link>
          <Link href="/login" className="hover:text-white">Connexion</Link>
          <Link href="/about" className="hover:text-white">À propos</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[1340px] text-xs text-slate-600">
        © 2026 ZAMI · Bêta Île-de-France · Estimation indicative · Devis final après visite technique.
      </div>
    </footer>
  );
}
