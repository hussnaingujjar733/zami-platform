import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HomeownerDashboard } from "../../components/dashboard/HomeownerDashboard";

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-[1340px]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        <HomeownerDashboard />
      </div>
    </main>
  );
}
