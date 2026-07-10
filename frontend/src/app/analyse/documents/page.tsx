import { EvidenceUpload } from "../../../components/zami/EvidenceUpload";
import { MvpPublicNav } from "../../../components/zami/MvpPublicNav";
import analysisStyles from "../../../components/zami/PropertyAnalysis.module.css";

export default function DocumentsPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <EvidenceUpload />
    </main>
  );
}
