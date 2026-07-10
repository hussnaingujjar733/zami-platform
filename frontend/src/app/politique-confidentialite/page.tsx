import Link from "next/link";
import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import styles from "../legal.module.css";

export default function PolitiqueConfidentialitePage() {
  return (
    <main className={styles.page}>
      <MvpPublicNav />

      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          Retour à l’accueil
        </Link>

        <article className={styles.card}>
          <span className={styles.badge}>Données personnelles</span>

          <h1>Politique de confidentialité</h1>

          <p className={styles.updated}>
            Dernière mise à jour : juillet 2026
          </p>

          <section className={styles.section}>
            <h2>Données collectées</h2>
            <p>
              ZAMI peut collecter les informations nécessaires à l’analyse d’un
              logement ou au suivi d’un projet : adresse du bien, informations
              projet, documents transmis, nom, email, téléphone et messages.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Finalités</h2>
            <p>Les données sont utilisées pour :</p>
            <ul>
              <li>préparer une analyse de rénovation ;</li>
              <li>contrôler un devis ou un document transmis ;</li>
              <li>créer et suivre une demande client ;</li>
              <li>contacter l’utilisateur au sujet de son projet ;</li>
              <li>améliorer la qualité du service ZAMI.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Base légale</h2>
            <p>
              Le traitement repose sur la demande de l’utilisateur, la
              préparation d’un service demandé, l’intérêt légitime de ZAMI à
              sécuriser le suivi des demandes, et le consentement lorsque cela
              est nécessaire.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Durée de conservation</h2>
            <p>
              Les données sont conservées uniquement pendant la durée nécessaire
              au traitement de la demande, au suivi du projet et au respect des
              obligations applicables. Une durée précise devra être fixée avant
              lancement public complet.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Partage des données</h2>
            <p>
              Les données peuvent être consultées par l’équipe ZAMI et par les
              prestataires techniques nécessaires au fonctionnement du service.
              Aucun fichier client n’est vendu à des tiers.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Droits des utilisateurs</h2>
            <p>
              Vous pouvez demander l’accès, la rectification, l’effacement ou la
              limitation du traitement de vos données en contactant :
              thezamifrance@gmail.com
            </p>
          </section>

          <section className={styles.section}>
            <h2>Cookies et mesure d’audience</h2>
            <p>
              Si ZAMI utilise des cookies ou outils de mesure d’audience non
              strictement nécessaires, une information et un choix clair devront
              être proposés aux utilisateurs.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
