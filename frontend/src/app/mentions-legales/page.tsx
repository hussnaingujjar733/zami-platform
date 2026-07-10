import Link from "next/link";
import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import styles from "../legal.module.css";

export default function MentionsLegalesPage() {
  return (
    <main className={styles.page}>
      <MvpPublicNav />

      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          Retour à l’accueil
        </Link>

        <article className={styles.card}>
          <span className={styles.badge}>Informations légales</span>

          <h1>Mentions légales</h1>

          <p className={styles.updated}>
            Dernière mise à jour : juillet 2026
          </p>

          <div className={styles.notice}>
            Cette page doit être complétée avec les informations exactes de
            l’éditeur avant un lancement public complet : statut juridique,
            adresse, SIRET/SIREN si applicable, hébergeur et contact officiel.
          </div>

          <section className={styles.section}>
            <h2>Éditeur du site</h2>
            <p>
              ZAMI est un service numérique d’aide à la préparation et au suivi
              de projets de rénovation énergétique.
            </p>
            <ul>
              <li>Nom commercial : ZAMI</li>
              <li>Responsable de publication : Hussnain Amanat Ali</li>
              <li>Email de contact : thezamifrance@gmail.com</li>
              <li>Adresse : à compléter avant lancement public</li>
              <li>SIRET/SIREN : à compléter si applicable</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Hébergement</h2>
            <p>
              Les informations de l’hébergeur doivent être complétées selon la
              plateforme utilisée en production.
            </p>
            <ul>
              <li>Hébergeur frontend : à compléter</li>
              <li>Hébergeur backend : à compléter</li>
              <li>Localisation des données : à compléter</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Nature du service</h2>
            <p>
              ZAMI fournit des estimations, des contrôles de cohérence et des
              outils d’aide à la décision. Les résultats sont indicatifs et ne
              remplacent pas un audit énergétique, un devis professionnel, une
              expertise juridique ou une validation administrative officielle.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Propriété intellectuelle</h2>
            <p>
              Les textes, interfaces, logos, visuels et éléments du service
              ZAMI sont protégés. Toute reproduction ou réutilisation non
              autorisée est interdite.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Contact</h2>
            <p>
              Pour toute question relative au site ou au service :
              thezamifrance@gmail.com
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
