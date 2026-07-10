import { ConfierProjetClient } from "../../components/zami/ConfierProjetClient";
import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import analysisStyles from "../../components/zami/PropertyAnalysis.module.css";

export default function ConfierProjetPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <ConfierProjetClient />
    </main>
  );
}
