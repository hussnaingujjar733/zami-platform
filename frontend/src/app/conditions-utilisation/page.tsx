import Link from "next/link";
import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import styles from "../legal.module.css";

export default function ConditionsUtilisationPage() {
  return (
    <main className={styles.page}>
      <MvpPublicNav />

      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          Retour à l’accueil
        </Link>

        <article className={styles.card}>
          <span className={styles.badge}>Cadre d’utilisation</span>

          <h1>Conditions d’utilisation</h1>

          <p className={styles.updated}>
            Dernière mise à jour : juillet 2026
          </p>

          <section className={styles.section}>
            <h2>Objet</h2>
            <p>
              Les présentes conditions encadrent l’utilisation du site ZAMI et
              des outils associés : analyse logement, contrôle de devis,
              préparation de dossier et suivi client.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Service indicatif</h2>
            <p>
              ZAMI fournit une aide à la décision. Les estimations, scores,
              alertes et recommandations sont indicatifs et doivent être
              vérifiés par des professionnels qualifiés avant tout engagement.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Documents transmis</h2>
            <p>
              L’utilisateur s’engage à transmettre des informations exactes et
              des documents qu’il est autorisé à partager. ZAMI peut signaler
              des incohérences mais ne garantit pas l’authenticité complète de
              chaque document sans revue professionnelle.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Disponibilité</h2>
            <p>
              Le service peut évoluer, être interrompu temporairement ou être
              limité pendant la phase MVP. ZAMI fera ses meilleurs efforts pour
              maintenir un service stable.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Responsabilité</h2>
            <p>
              L’utilisateur reste responsable de ses décisions, signatures,
              paiements et choix de prestataires. ZAMI ne se substitue pas à un
              professionnel du bâtiment, un conseiller juridique ou un organisme
              administratif.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Contact</h2>
            <p>
              Pour toute question concernant ces conditions :
              thezamifrance@gmail.com
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
