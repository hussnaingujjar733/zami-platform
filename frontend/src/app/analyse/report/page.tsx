import { DecisionReport } from "../../../components/zami/DecisionReport";
import { MvpPublicNav } from "../../../components/zami/MvpPublicNav";
import analysisStyles from "../../../components/zami/PropertyAnalysis.module.css";

export default function ReportPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <DecisionReport />
    </main>
  );
}
