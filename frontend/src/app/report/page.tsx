import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportView } from "../../components/report/ReportView";

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-950 print:bg-white">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            Retour dashboard
          </Link>

          <div className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white">
            Ctrl+P → Enregistrer en PDF
          </div>
        </div>

        <ReportView />
      </div>
    </main>
  );
}
