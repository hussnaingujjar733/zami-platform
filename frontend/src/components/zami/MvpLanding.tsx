"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeEuro,
  Banknote,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileSearch,
  Flame,
  Gauge,
  Hammer,
  Home,
  House,
  Leaf,
  MapPin,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  ThermometerSun,
  Upload,
  UserCheck,
  WalletCards,
  Wind,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { OfficialAddressAutocomplete } from "./OfficialAddressAutocomplete";
import styles from "./MarketplaceLanding.module.css";

type SearchTab = "analyse" | "devis" | "projet";

export 
const zamiToolLinks: Record<string, string> = {
  "Diagnostic énergétique": "/analyse",
  "Budget rénovation": "/analyse",
  "Aides potentielles": "/analyse",
  "Économies estimées": "/analyse",
  "Contrôle de devis": "/quote-check",
  "Vérification sur site": "/confier-projet",
};


function openZamiTool(title: string) {
  const routes: Record<string, string> = {
    "Diagnostic énergétique": "/analyse",
    "Budget rénovation": "/analyse",
    "Aides potentielles": "/analyse",
    "Économies estimées": "/analyse",
    "Contrôle de devis": "/quote-check",
    "Vérification sur site": "/confier-projet",
  };

  window.location.href = routes[title] || "/analyse";
}

export function MvpLanding() {
  const [activeTab, setActiveTab] =
    useState<SearchTab>("analyse");

  return (
    <>
      <section id="adresse" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroTop}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <ShieldCheck size={15} />
                Analyse gratuite · Données françaises
              </div>

              <h1>
                Comprenez votre logement
                <span> avant de lancer vos travaux.</span>
              </h1>

              <p>
                Identifiez les priorités, vérifiez les informations
                disponibles et préparez un projet de rénovation plus sûr.
              </p>

              <div className={styles.heroActions}>
                <a href="/analyse" className={styles.heroPrimaryCta}>
                  Analyser mon logement
                  <ArrowRight size={15} />
                </a>

                <a href="/quote-check" className={styles.heroSecondaryCta}>
                  Vérifier un devis
                </a>

                <a href="/confier-projet" className={styles.heroGhostCta}>
                  Confier mon projet
                </a>
              </div>
            </div>

            <aside className={styles.heroVisual} aria-label="Aperçu ZAMI">
              <div className={styles.visualGlow} />

              <div className={styles.dashboardStack}>
                <div className={styles.visualCard}>
                  <div className={styles.visualCardTop}>
                    <span>Dossier logement</span>
                    <strong>Score 82%</strong>
                  </div>

                  <div className={styles.scoreRing}>
                    <span>B</span>
                  </div>

                  <div className={styles.miniMetrics}>
                    <p>
                      <Check size={13} />
                      DPE trouvé
                    </p>
                    <p>
                      <Check size={13} />
                      Budget estimé
                    </p>
                    <p>
                      <Check size={13} />
                      Devis à vérifier
                    </p>
                  </div>
                </div>

                <div className={styles.visualCardSecondary}>
                  <small>Budget rénovation</small>
                  <strong>8 500 € – 12 400 €</strong>
                  <div className={styles.miniProgress}>
                    <span />
                  </div>
                </div>

                <div className={styles.visualCardSecondary}>
                  <small>QuoteGuard</small>
                  <strong>2 points de vigilance</strong>
                  <div className={styles.warningRow}>
                    <span>Prix atypique</span>
                    <span>SIRET à confirmer</span>
                  </div>
                </div>

                <div className={styles.floatBadge}>
                  <ShieldCheck size={15} />
                  Revue humaine avant engagement
                </div>
              </div>

              <div className={styles.visualProof}>
                <span>La méthode ZAMI</span>
                <strong>Faits, estimations et incertitudes séparés.</strong>
              </div>
            </aside>
          </div>

          <div className={styles.searchCard}>
            <div className={styles.tabs}>
              <button
                type="button"
                className={activeTab === "analyse" ? styles.tabActive : ""}
                onClick={() => setActiveTab("analyse")}
              >
                Analyser mon logement
              </button>

              <a href="/quote-check" className={styles.tabLink}>
                Vérifier un devis
              </a>

              <a href="/confier-projet" className={styles.tabLink}>
                Confier mon projet
              </a>
            </div>

            <div className={styles.searchContent}>
              {activeTab === "analyse" && (
                <>
                  <div className={styles.searchHeading}>
                    <div>
                      <h2>Recherchez votre logement</h2>

                      <p>
                        Sélectionnez l’adresse officielle proposée sous le
                        champ de recherche.
                      </p>
                    </div>

                    <span className={styles.officialSource}>
                      <ShieldCheck size={15} />
                      Base Adresse Nationale
                    </span>
                  </div>

                  <div className={styles.searchPanel}>
                    <label>Adresse du logement</label>
                    <OfficialAddressAutocomplete />
                  </div>

                  <div className={styles.searchReassurance}>
                    <span>
                      <Check size={14} />
                      Sans création de compte
                    </span>

                    <span>
                      <Check size={14} />
                      Sans démarchage automatique
                    </span>

                    <span>
                      <Check size={14} />
                      Sources clairement indiquées
                    </span>
                  </div>
                </>
              )}

              {activeTab === "devis" && (
                <div className={styles.alternativePanel}>
                  <span className={styles.alternativeIcon}>
                    <Upload size={25} />
                  </span>

                  <div>
                    <h3>Contrôle de devis QuoteGuard</h3>

                    <p>
                      Prix, postes manquants, qualifications et conditions
                      seront vérifiés avant votre signature.
                    </p>
                  </div>

                  <a href="/quote-check">
                    Découvrir QuoteGuard
                    <ArrowRight size={15} />
                  </a>
                </div>
              )}

              {activeTab === "projet" && (
                <div className={styles.alternativePanel}>
                  <span className={styles.alternativeIcon}>
                    <UserCheck size={25} />
                  </span>

                  <div>
                    <h3>Un accompagnement du diagnostic au chantier</h3>

                    <p>
                      Commencez par identifier le logement. ZAMI pourra ensuite
                      préparer le projet et les points à vérifier sur place.
                    </p>
                  </div>

                  <a href="/analyse" className={styles.primaryInlineCta}>
                    Identifier le logement
                    <ArrowRight size={15} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className={styles.content}>
        <section id="outils" className={styles.section}>
          <SectionHeader
            eyebrow="Explorez les outils ZAMI"
            title="Tout comprendre avant de décider."
            description="Une plateforme unique pour analyser le logement, préparer le budget et sécuriser les engagements."
          />

          <div className={styles.toolGrid}>
            <ToolCard
              icon={<Gauge size={23} />}
              title="Diagnostic énergétique"
              href="/analyse"
              description="Retrouvez le DPE disponible et distinguez les données confirmées des éléments manquants."
            />

            <ToolCard
              icon={<Calculator size={23} />}
              title="Budget rénovation"
              href="/analyse"
              description="Obtenez des fourchettes de coûts avec leurs hypothèses et leur niveau de confiance."
            />

            <ToolCard
              icon={<BadgeEuro size={23} />}
              title="Aides potentielles"
              href="/analyse"
              description="Identifiez les dispositifs qui pourraient s’appliquer à votre situation."
            />

            <ToolCard
              icon={<Banknote size={23} />}
              title="Économies estimées"
              href="/analyse"
              description="Comparez des scénarios prudent, central et favorable avant de vous engager."
            />

            <ToolCard
              icon={<FileSearch size={23} />}
              title="Contrôle de devis"
              href="/quote-check"
              description="Repérez les prix atypiques, les descriptions vagues et les travaux manquants."
            />

            <ToolCard
              icon={<UserCheck size={23} />}
              title="Vérification sur site"
              href="/confier-projet"
              description="Confirmez les éléments techniques visibles avec une intervention humaine."
            />
          </div>
        </section>

        <section className={`${styles.section} ${styles.visionSection}`}>
          <div className={styles.visionVisual}>
            <div className={styles.roomMockup}>
              <div className={styles.roomWindow} />
              <div className={styles.roomWall} />
              <div className={styles.roomFloor} />

              <div className={styles.auditCard}>
                <span>Dossier prêt</span>
                <strong>82%</strong>
                <small>Données confirmées + points à vérifier</small>
              </div>

              <div className={styles.energyBadge}>
                <ShieldCheck size={15} />
                DPE + devis + chantier
              </div>
            </div>
          </div>

          <div className={styles.visionCopy}>
            <span className={styles.sectionEyebrow}>
              Avant de vous engager
            </span>

            <h2>Une vision claire avant de lancer les travaux.</h2>

            <p>
              ZAMI transforme les informations dispersées — DPE, devis,
              budget, aides et documents — en un dossier lisible pour décider
              avec plus de confiance.
            </p>

            <div className={styles.visionChecklist}>
              <div>
                <Check size={15} />
                Données officielles quand disponibles
              </div>

              <div>
                <Check size={15} />
                Hypothèses et incertitudes clairement affichées
              </div>

              <div>
                <Check size={15} />
                Devis vérifiés avant engagement
              </div>

              <div>
                <Check size={15} />
                Suivi client pendant le chantier
              </div>
            </div>

            <div className={styles.visionActions}>
              <a href="/analyse">
                Analyser mon logement
                <ArrowRight size={15} />
              </a>

              <a href="/confier-projet">
                Confier mon projet
              </a>
            </div>
          </div>
        </section>

        <div id="solutions" className={styles.lightSection}>
          <section className={styles.section}>
            <SectionHeader
              eyebrow="Solutions de rénovation"
              title="Les travaux les plus souvent étudiés."
              description="Ces exemples sont généraux. Les recommandations propres au logement apparaissent uniquement après l’analyse."
            />

            <div className={styles.solutionsGrid}>
              <SolutionCard
                icon={<ThermometerSun size={26} />}
                title="Isolation des combles"
                description="Réduire les pertes de chaleur par la toiture lorsque la configuration le permet."
                category="Enveloppe"
                impact="Élevé"
              />

              <SolutionCard
                icon={<Flame size={26} />}
                title="Système de chauffage"
                description="Comparer les solutions selon le logement, son isolation et les usages réels."
                category="Équipement"
                impact="Variable"
              />

              <SolutionCard
                icon={<Wind size={26} />}
                title="Ventilation"
                description="Améliorer le renouvellement de l’air et limiter certains risques d’humidité."
                category="Qualité de l’air"
                impact="Essentiel"
              />

              <SolutionCard
                icon={<Home size={26} />}
                title="Isolation des murs"
                description="Étudier les contraintes techniques avant de choisir une isolation intérieure ou extérieure."
                category="Enveloppe"
                impact="Élevé"
              />

              <SolutionCard
                icon={<Building2 size={26} />}
                title="Fenêtres performantes"
                description="Évaluer leur priorité réelle par rapport aux autres pertes énergétiques du bâtiment."
                category="Menuiseries"
                impact="Modéré"
              />

              <SolutionCard
                icon={<Sparkles size={26} />}
                title="Rénovation globale"
                description="Ordonner les travaux pour éviter les incompatibilités et les dépenses répétées."
                category="Projet complet"
                impact="Très élevé"
              />
            </div>
          </section>
        </div>

        <section id="fonctionnement" className={styles.section}>
          <SectionHeader
            eyebrow="Votre parcours"
            title="Un projet structuré en quatre étapes."
            description="ZAMI améliore progressivement le niveau de confiance sans demander toutes les informations dès le départ."
          />

          <div className={styles.stepsGrid}>
            <StepCard
              number="01"
              title="Identifiez le logement"
              description="Sélectionnez l’adresse officielle et consultez les premières données disponibles."
            />

            <StepCard
              number="02"
              title="Complétez l’essentiel"
              description="Répondez uniquement aux questions utiles pour ce bâtiment."
            />

            <StepCard
              number="03"
              title="Recevez le rapport"
              description="Visualisez les priorités, fourchettes, sources et incertitudes."
            />

            <StepCard
              number="04"
              title="Sécurisez le projet"
              description="Analysez les devis et confirmez les points sensibles avant la signature."
            />
          </div>
        </section>

        <section id="devis" className={styles.quotePanel}>
          <div>
            <span>QuoteGuard par ZAMI</span>

            <h2>
              Vous avez déjà reçu un devis de rénovation ?
            </h2>

            <p>
              Vérifiez les postes, les prix, les éléments manquants, les
              qualifications professionnelles et les conditions de paiement
              avant de signer.
            </p>
          </div>

          <aside className={styles.quoteAction}>
            <strong>Contrôle de devis</strong>

            <small>
              Ajoutez un devis PDF dans le parcours documents, puis ouvrez le rapport pour lancer la vérification automatique.
            </small>

            <button type="button" disabled>
              Disponible dans le rapport
            </button>
          </aside>
        </section>

        <section className={styles.section}>
          <SectionHeader
            eyebrow="Pourquoi faire confiance à ZAMI"
            title="La transparence avant la promesse."
            description="Chaque résultat doit pouvoir être compris, vérifié et corrigé lorsque de nouvelles preuves sont ajoutées."
          />

          <div className={styles.trustGrid}>
            <TrustCard
              icon={<ShieldCheck size={23} />}
              title="Données officielles"
              description="Les sources françaises consultées sont nommées et datées."
            />

            <TrustCard
              icon={<SearchCheck size={23} />}
              title="Hypothèses visibles"
              description="Une estimation ZAMI n’est jamais présentée comme un fait officiel."
            />

            <TrustCard
              icon={<ClipboardCheck size={23} />}
              title="Informations manquantes"
              description="Les points encore inconnus restent clairement affichés."
            />

            <TrustCard
              icon={<FileCheck2 size={23} />}
              title="Validation progressive"
              description="Documents, photographies et inspection renforcent le dossier."
            />
          </div>
        </section>
      </main>

      <footer id="footer" className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <Link href="/" className={styles.brand}>
                <span className={styles.brandMark}>
                  <House size={21} />
                </span>

                <span className={styles.brandText}>
                  <strong>ZAMI</strong>
                  <small>Rénovation en confiance</small>
                </span>
              </Link>

              <p className={styles.footerDescription}>
                ZAMI aide les propriétaires à comprendre, vérifier et
                sécuriser leur projet de rénovation avant de signer un devis.
              </p>
            </div>

            <FooterColumn
              title="Analyser"
              links={[
                "Mon logement",
                "Mon DPE",
                "Mon budget",
              ]}
            />

            <FooterColumn
              title="Sécuriser"
              links={[
                "Vérifier un devis",
                "Préparer une visite",
                "Comprendre les sources",
              ]}
            />

            <FooterColumn
              title="ZAMI"
              links={[
                "Comment ça marche",
                "Connexion client",
                "Mentions légales",
                "Confidentialité",
                "Conditions d’utilisation",
                "Contact",
              ]}
            />
          </div>

          <div className={styles.footerBottom}>
            <span>© 2026 ZAMI. Tous droits réservés.</span>

            <span>
              Analyse indicative — ne remplace pas un audit ou un devis
              professionnel.
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>

      <p>{description}</p>
    </div>
  );
}

function ToolCard({
  icon,
  title,
  description,
  href,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <article className={styles.toolCard}>
      <div className={styles.toolIcon}>{icon}</div>

      <h3>{title}</h3>
      <p>{description}</p>

      <footer>
        <a href={href} aria-label={`Ouvrir ${title}`}>
          En savoir plus
          <ArrowRight size={13} />
        </a>
      </footer>
    </article>
  );
}

function SolutionCard({
  icon,
  title,
  description,
  category,
  impact,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  category: string;
  impact: string;
}) {
  return (
    <article className={styles.solutionCard}>
      <div className={styles.solutionVisual}>
        <span>{icon}</span>
        <span className={styles.solutionStatus}>
          Exemple indicatif
        </span>
      </div>

      <div className={styles.solutionBody}>
        <h3>{title}</h3>
        <p>{description}</p>

        <div className={styles.solutionMeta}>
          <span>
            Catégorie
            <strong>{category}</strong>
          </span>

          <span>
            Impact potentiel
            <strong>{impact}</strong>
          </span>
        </div>
      </div>
    </article>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className={styles.stepCard}>
      <span className={styles.stepNumber}>{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function TrustCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className={styles.trustCard}>
      {icon}
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
  );
}


function footerLinkHref(label: string) {
  const routes: Record<string, string> = {
    "Mon DPE": "/analyse",
    "Mon budget": "/analyse",
    "Diagnostic énergétique": "/analyse",
    "Budget rénovation": "/analyse",
    "Vérifier un devis": "/quote-check",
    "Contrôle de devis": "/quote-check",
    "Préparer une visite": "/confier-projet",
    "Confier mon projet": "/confier-projet",
    "Connexion client": "/login",
    "Suivi de demande": "/retrouver-ma-demande",
    "Retrouver ma demande": "/retrouver-ma-demande",
    "Comment ça marche": "/#outils",
    "Comprendre les sources": "/#outils",
    "Mentions légales": "/mentions-legales",
    "Confidentialité": "/politique-confidentialite",
    "Conditions d’utilisation": "/conditions-utilisation",
    "Contact": "/contact",
  };

  return routes[label] || "/";
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: string[];
}) {
  return (
    <div className={styles.footerColumn}>
      <strong>{title}</strong>

      {links.map((link) => (
        <a href={footerLinkHref(link)} key={link}>
          {link}
        </a>
      ))}
    </div>
  );
}

export default MvpLanding;
