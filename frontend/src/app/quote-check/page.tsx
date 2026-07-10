import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import { QuoteGuardStandalone } from "../../components/zami/QuoteGuardStandalone";
import analysisStyles from "../../components/zami/PropertyAnalysis.module.css";

export default function QuoteCheckPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <QuoteGuardStandalone />
    </main>
  );
}
