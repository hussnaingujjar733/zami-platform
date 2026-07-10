import { MvpLanding } from "../components/zami/MvpLanding";
import { MvpPublicNav } from "../components/zami/MvpPublicNav";
import styles from "../components/zami/MarketplaceLanding.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <MvpPublicNav />
      <MvpLanding />
    </main>
  );
}
