import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import { ZamiTeamLeadsClient } from "../../components/zami/ZamiTeamLeadsClient";
import analysisStyles from "../../components/zami/PropertyAnalysis.module.css";

export default function ZamiTeamPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <ZamiTeamLeadsClient />
    </main>
  );
}
