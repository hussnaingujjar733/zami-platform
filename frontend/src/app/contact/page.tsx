import Link from "next/link";
import { Mail, ShieldCheck, FileText, Home } from "lucide-react";
import { MvpPublicNav } from "../../components/zami/MvpPublicNav";
import styles from "../legal.module.css";

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <MvpPublicNav />

      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          Retour à l’accueil
        </Link>

        <article className={styles.card}>
          <span className={styles.badge}>Contact ZAMI</span>

          <h1>Nous contacter</h1>

          <p className={styles.updated}>
            Une question sur un devis, un projet ou votre espace client ?
          </p>

          <section className={styles.section}>
            <h2>Email principal</h2>
            <p>
              Pour toute demande générale, envoyez un email à :
            </p>
            <p>
              <a href="mailto:thezamifrance@gmail.com">
                thezamifrance@gmail.com
              </a>
            </p>
          </section>

          <section className={styles.section}>
            <h2>Selon votre besoin</h2>

            <ul>
              <li>
                <Home size={15} /> Pour analyser un logement : utilisez la page
                “Analyser mon logement”.
              </li>
              <li>
                <FileText size={15} /> Pour vérifier un devis : utilisez
                QuoteGuard.
              </li>
              <li>
                <ShieldCheck size={15} /> Pour confier un projet complet :
                utilisez “Confier mon projet”.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>Clients ZAMI</h2>
            <p>
              Si vous avez déjà un numéro de demande, connectez-vous à votre
              espace client pour suivre votre dossier, vos documents et les
              prochaines étapes.
            </p>
          </section>

          <div className={styles.notice}>
            ZAMI est actuellement en phase MVP. Les réponses peuvent être
            traitées manuellement pendant les premières demandes.
          </div>

          <section className={styles.section}>
            <h2>Accès rapide</h2>
            <ul>
              <li>
                <a href="/analyse">Analyser mon logement</a>
              </li>
              <li>
                <a href="/quote-check">Vérifier un devis</a>
              </li>
              <li>
                <a href="/confier-projet">Confier mon projet</a>
              </li>
              <li>
                <a href="/login">Connexion client</a>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
