import { Suspense } from "react";

import { AdaptiveQuestionnaire } from "../../../components/zami/AdaptiveQuestionnaire";
import { MvpPublicNav } from "../../../components/zami/MvpPublicNav";
import analysisStyles from "../../../components/zami/PropertyAnalysis.module.css";

function QuestionnaireFallback() {
  return (
    <section className="zmvp-snapshot-state">
      <span>Questionnaire intelligent</span>
      <h1>Préparation des questions…</h1>

      <p>
        ZAMI adapte le parcours aux informations déjà disponibles.
      </p>
    </section>
  );
}

export default function QuestionsPage() {
  return (
    <main className={analysisStyles.page}>
      <MvpPublicNav />

      <Suspense fallback={<QuestionnaireFallback />}>
        <AdaptiveQuestionnaire />
      </Suspense>
    </main>
  );
}
