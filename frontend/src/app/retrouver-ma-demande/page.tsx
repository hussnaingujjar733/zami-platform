import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import { RetrouverDemandeClient } from "../../components/zami/RetrouverDemandeClient";
import analysisStyles from "../../components/zami/PropertyAnalysis.module.css";

export default function RetrouverMaDemandePage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <RetrouverDemandeClient />
    </main>
  );
}
