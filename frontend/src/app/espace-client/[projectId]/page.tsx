import { ClientEspaceClient } from "../../../components/zami/ClientEspaceClient";
import { MvpPublicNav } from "../../../components/zami/MvpPublicNav";
import analysisStyles from "../../../components/zami/PropertyAnalysis.module.css";

export default function ClientEspacePage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <ClientEspaceClient />
    </main>
  );
}
