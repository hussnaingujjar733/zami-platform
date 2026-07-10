import { Suspense } from "react";

import { AddressSnapshot } from "../../components/zami/AddressSnapshot";
import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import styles from "../../components/zami/PropertyAnalysis.module.css";

function SnapshotLoading() {
  return (
    <section className="zmvp-snapshot-state">
      <span>Analyse du logement</span>
      <h1>Chargement des données officielles…</h1>

      <p>
        ZAMI vérifie l’adresse et recherche les informations disponibles
        pour ce logement.
      </p>
    </section>
  );
}

export default function AnalysePage() {
  return (
    <main className={styles.page}>
      <MvpPublicNav />

      <Suspense fallback={<SnapshotLoading />}>
        <AddressSnapshot />
      </Suspense>
    </main>
  );
}
