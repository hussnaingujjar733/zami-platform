import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  UserRound,
} from "lucide-react";

import styles from "./MarketplaceLanding.module.css";

export function MvpPublicNav() {
  return (
    <header className={styles.navHeader}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/brand/zami-logo.png"
            alt="ZAMI"
            width={132}
            height={44}
            priority
            className={styles.logoImage}
          />
        </Link>

        <div className={styles.navLinks}>
          <a href="/#adresse">Analyser</a>
          <a href="/#outils">Outils</a>
          <a href="/#solutions">Solutions</a>
          <a href="/#fonctionnement">Comment ça marche</a>
          <a href="/#devis">Vérifier un devis</a>
        </div>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.clientLink}>
            <UserRound size={16} />
            Connexion client
          </Link>

          <a href="/#adresse" className={styles.primaryNavButton}>
            Démarrer
            <ArrowRight size={15} />
          </a>
        </div>
      </nav>
    </header>
  );
}
