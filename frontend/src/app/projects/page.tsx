import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import { SavedProjects } from "../../components/zami/SavedProjects";
import analysisStyles from "../../components/zami/PropertyAnalysis.module.css";

export default function ProjectsPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />
      <SavedProjects />
    </main>
  );
}
