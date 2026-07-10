"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gauge,
  Home,
  Info,
  MapPin,
  Printer,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import styles from "./DecisionReport.module.css";

type AnswerValue = string | number;
type Answers = Record<string, AnswerValue>;

type Snapshot = {
  address?: {
    status?: string;
    verified?: boolean;
    match_score?: number;
    value?: {
      label?: string;
      postcode?: string | null;
      city?: string | null;
      municipality?: string | null;
    };
  };
  dpe?: {
    status?: string;
    verified?: boolean;
    value?: {
      energy_class?: string | null;
      ghg_class?: string | null;
      consumption?: number | null;
      emissions?: number | null;
    } | null;
  };
  completeness?: number | {
    score?: number;
  };
  confidence?: string | {
    level?: string;
  };
  missing_information?: string[];
};

type QuestionnaireDraft = {
  answers?: Answers;
};

type Evidence = {
  id: string;
  evidence_type: string;
  original_filename: string;
  file_kind: string;
  size_bytes: number;
  verification_status: string;
  analysis_status: string;
  uploaded_at?: string;
};

const answerLabels: Record<string, Record<string, string>> = {
  has_dpe_document: {
    yes: "DPE ou audit disponible",
    no: "Aucun document disponible",
    unknown: "Information inconnue",
  },
  property_type: {
    house: "Maison individuelle",
    apartment: "Appartement",
  },
  apartment_floor: {
    ground: "Rez-de-chaussée",
    middle: "Étage intermédiaire",
    top: "Dernier étage",
    unknown: "Information inconnue",
  },
  construction_period: {
    before_1948: "Avant 1948",
    "1948_1974": "1948 à 1974",
    "1975_1988": "1975 à 1988",
    "1989_2000": "1989 à 2000",
    "2001_2012": "2001 à 2012",
    after_2012: "Après 2012",
    unknown: "Information inconnue",
  },
  heating_system: {
    gas: "Chaudière gaz",
    electric: "Chauffage électrique",
    heat_pump: "Pompe à chaleur",
    oil: "Fioul",
    wood: "Bois ou granulés",
    district: "Chauffage collectif ou réseau",
    other: "Autre système",
    unknown: "Information inconnue",
  },
  roof_insulation: {
    good: "Isolation récente ou en bon état",
    old: "Isolation ancienne",
    none: "Toiture ou combles non isolés",
    unknown: "Information inconnue",
  },
  wall_insulation: {
    good: "Isolation récente ou performante",
    partial: "Isolation partielle ou ancienne",
    none: "Murs non isolés",
    unknown: "Information inconnue",
  },
  windows: {
    single: "Simple vitrage",
    old_double: "Double vitrage ancien",
    recent_double: "Double vitrage récent",
    triple: "Triple vitrage",
    mixed: "Plusieurs types de fenêtres",
    unknown: "Information inconnue",
  },
  ventilation: {
    natural: "Ventilation naturelle",
    single_flow: "VMC simple flux",
    double_flow: "VMC double flux",
    none: "Aucun système identifié",
    unknown: "Information inconnue",
  },
  primary_objective: {
    comfort: "Améliorer le confort",
    bills: "Réduire les factures",
    dpe: "Améliorer le DPE",
    sell: "Préparer une vente ou une location",
    complete_project: "Préparer une rénovation globale",
    quote_check: "Vérifier un projet ou un devis",
  },
};

const questionLabels: Record<string, string> = {
  has_dpe_document: "Document énergétique",
  property_type: "Type de logement",
  apartment_floor: "Position dans l’immeuble",
  living_surface: "Surface habitable",
  construction_period: "Période de construction",
  heating_system: "Chauffage principal",
  roof_insulation: "Isolation de la toiture",
  wall_insulation: "Isolation des murs",
  windows: "Fenêtres",
  ventilation: "Ventilation",
  annual_energy_bill: "Facture énergétique annuelle",
  primary_objective: "Objectif principal",
};

const evidenceLabels: Record<string, string> = {
  dpe: "DPE",
  energy_audit: "Audit énergétique",
  energy_bill: "Facture énergétique",
  quote: "Devis de rénovation",
  facade: "Photo de la façade",
  windows: "Photo des fenêtres",
  roof_attic: "Photo de la toiture ou des combles",
  heating_system: "Photo du chauffage",
  humidity: "Photo d’humidité visible",
};

export function DecisionReport() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const snapshotRaw = window.localStorage.getItem(
        "zami_property_snapshot",
      );

      const questionnaireRaw = window.localStorage.getItem(
        "zami_questionnaire_draft",
      );

      const evidenceRaw = window.localStorage.getItem(
        "zami_uploaded_evidence",
      );

      if (snapshotRaw) {
        setSnapshot(JSON.parse(snapshotRaw) as Snapshot);
      }

      if (questionnaireRaw) {
        const draft = JSON.parse(
          questionnaireRaw,
        ) as QuestionnaireDraft;

        setAnswers(draft.answers || {});
      }

      if (evidenceRaw) {
        setEvidence(JSON.parse(evidenceRaw) as Evidence[]);
      }
    } catch {
      // Invalid local values are ignored safely.
    } finally {
      setLoaded(true);
    }
  }, []);

  const addressLabel =
    snapshot?.address?.value?.label || "Logement analysé";

  const addressVerified =
    snapshot?.address?.verified === true ||
    snapshot?.address?.status === "verified";

  const dpeVerified =
    snapshot?.dpe?.status === "available" &&
    snapshot?.dpe?.verified === true;

  const answeredEntries = useMemo(
    () =>
      Object.entries(answers).filter(
        ([, value]) => value !== "" && value !== undefined,
      ),
    [answers],
  );

  const dossierScore = useMemo(() => {
    let score = 0;

    if (addressVerified) {
      score += 20;
    }

    if (dpeVerified) {
      score += 20;
    }

    score += Math.min(
      40,
      Math.round((answeredEntries.length / 10) * 40),
    );

    score += Math.min(20, evidence.length * 4);

    return Math.min(100, score);
  }, [
    addressVerified,
    dpeVerified,
    answeredEntries.length,
    evidence.length,
  ]);

  const verificationPoints = useMemo(
    () => buildVerificationPoints(snapshot, answers, evidence),
    [snapshot, answers, evidence],
  );

  if (!loaded) {
    return (
      <section className={styles.loading}>
        <Gauge size={38} />
        <h1>Préparation du rapport…</h1>
        <p>
          ZAMI rassemble les données officielles, les réponses et les
          documents du dossier.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/analyse/documents">
          <ArrowLeft size={16} />
          Retour aux documents
        </Link>

        <div className={styles.topActions}>
          <span>Étape 4 sur 4 · Rapport de décision</span>

          <button
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Imprimer ou enregistrer en PDF
          </button>
        </div>
      </div>

      <header className={styles.reportHeader}>
        <div>
          <span className={styles.eyebrow}>
            Rapport préliminaire ZAMI
          </span>

          <h1>{addressLabel}</h1>

          <p>
            Synthèse des informations disponibles avant la
            préparation d’un programme de rénovation ou la signature
            d’un devis.
          </p>

          <div className={styles.headerBadges}>
            <StatusBadge
              complete={addressVerified}
              label={
                addressVerified
                  ? "Adresse officielle vérifiée"
                  : "Adresse à confirmer"
              }
            />

            <StatusBadge
              complete={dpeVerified}
              label={
                dpeVerified
                  ? "DPE strictement associé"
                  : "DPE non confirmé"
              }
            />

            <StatusBadge
              complete={answeredEntries.length >= 6}
              label={`${answeredEntries.length} réponses propriétaire`}
            />
          </div>
        </div>

        <aside className={styles.scoreCard}>
          <span>Préparation du dossier</span>
          <strong>{dossierScore}%</strong>

          <div>
            <i style={{ width: `${dossierScore}%` }} />
          </div>

          <p>
            Ce score mesure la quantité de données disponibles. Il ne
            mesure pas la qualité technique du logement.
          </p>
        </aside>
      </header>

      <div className={styles.summaryGrid}>
        <SummaryCard
          icon={<MapPin size={22} />}
          label="Adresse"
          value={
            addressVerified
              ? "Vérifiée"
              : "Confirmation nécessaire"
          }
          status={addressVerified ? "complete" : "warning"}
        />

        <SummaryCard
          icon={<Gauge size={22} />}
          label="Performance énergétique"
          value={
            dpeVerified
              ? `Classe ${
                  snapshot?.dpe?.value?.energy_class || "confirmée"
                }`
              : "DPE non trouvé ou non associé"
          }
          status={dpeVerified ? "complete" : "warning"}
        />

        <SummaryCard
          icon={<UserRound size={22} />}
          label="Informations déclarées"
          value={`${answeredEntries.length} réponses`}
          status={
            answeredEntries.length >= 6
              ? "complete"
              : "warning"
          }
        />

        <SummaryCard
          icon={<Upload size={22} />}
          label="Documents et photos"
          value={`${evidence.length} fichier${
            evidence.length > 1 ? "s" : ""
          }`}
          status={evidence.length > 0 ? "complete" : "neutral"}
        />
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.mainColumn}>
          <ReportSection
            icon={<Home size={21} />}
            eyebrow="Profil du logement"
            title="Informations déclarées par le propriétaire"
          >
            {answeredEntries.length > 0 ? (
              <div className={styles.factGrid}>
                {answeredEntries.map(([key, value]) => (
                  <div key={key}>
                    <span>{questionLabels[key] || key}</span>
                    <strong>{formatAnswer(key, value)}</strong>
                    <small>Source : propriétaire</small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyMessage>
                Le questionnaire propriétaire n’a pas encore été
                complété.
              </EmptyMessage>
            )}
          </ReportSection>

          <ReportSection
            icon={<ClipboardCheck size={21} />}
            eyebrow="Points de contrôle"
            title="Éléments à confirmer avant une décision"
          >
            <div className={styles.checkList}>
              {verificationPoints.map((point, index) => (
                <article key={`${point.title}-${index}`}>
                  <span
                    className={
                      point.priority === "high"
                        ? styles.highPriority
                        : styles.normalPriority
                    }
                  >
                    <AlertTriangle size={17} />
                  </span>

                  <div>
                    <strong>{point.title}</strong>
                    <p>{point.description}</p>

                    <small>
                      Déduction préliminaire · À vérifier par document
                      ou professionnel
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </ReportSection>

          <ReportSection
            icon={<FileCheck2 size={21} />}
            eyebrow="Documents"
            title="Preuves associées au dossier"
          >
            {evidence.length > 0 ? (
              <div className={styles.evidenceList}>
                {evidence.map((item) => (
                  <article key={item.id}>
                    <span>
                      {item.file_kind === "pdf" ? (
                        <FileText size={19} />
                      ) : (
                        <Building2 size={19} />
                      )}
                    </span>

                    <div>
                      <strong>{item.original_filename}</strong>

                      <small>
                        {evidenceLabels[item.evidence_type] ||
                          item.evidence_type}
                        {" · "}
                        {formatFileSize(item.size_bytes)}
                      </small>
                    </div>

                    <em>Analyse en attente</em>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyMessage>
                Aucun document ou photographie n’a été ajouté.
              </EmptyMessage>
            )}
          </ReportSection>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.sourcePanel}>
            <span className={styles.sectionEyebrow}>
              Traçabilité
            </span>

            <h2>Origine des informations</h2>

            <SourceLine
              icon={<ShieldCheck size={17} />}
              title="Adresse"
              source="Donnée officielle française"
              status={
                addressVerified ? "Vérifiée" : "À confirmer"
              }
              complete={addressVerified}
            />

            <SourceLine
              icon={<Gauge size={17} />}
              title="DPE"
              source="Base publique ADEME"
              status={
                dpeVerified
                  ? "Strictement associé"
                  : "Non disponible"
              }
              complete={dpeVerified}
            />

            <SourceLine
              icon={<UserRound size={17} />}
              title="Questionnaire"
              source="Déclaration propriétaire"
              status="Non vérifiée"
              complete={false}
            />

            <SourceLine
              icon={<FileCheck2 size={17} />}
              title="Documents"
              source="Fichiers téléversés"
              status={
                evidence.length
                  ? "Reçus, analyse en attente"
                  : "Aucun fichier"
              }
              complete={false}
            />
          </section>

          <section className={styles.limitPanel}>
            <Info size={21} />

            <h2>Limites du rapport</h2>

            <p>
              Ce rapport ne remplace pas un audit énergétique, une
              visite technique, une étude structurelle ou un devis
              professionnel.
            </p>

            <ul>
              <li>Aucun défaut caché n’est diagnostiqué.</li>
              <li>Aucune aide financière n’est garantie.</li>
              <li>Aucun prix de travaux n’est encore confirmé.</li>
              <li>
                Les documents téléversés n’ont pas encore été
                interprétés.
              </li>
            </ul>
          </section>

          <section className={styles.nextPanel}>
            <span>Prochaine décision</span>
            <h2>Préparez les vérifications prioritaires.</h2>

            <p>
              Utilisez cette synthèse pour demander des informations
              complémentaires et comparer les futurs devis.
            </p>

            <Link href="/analyse/documents">
              Compléter le dossier
            </Link>
          </section>
        </aside>
      </div>

      <footer className={styles.reportFooter}>
        <div>
          <ShieldCheck size={18} />

          <p>
            ZAMI sépare les données officielles, les déclarations du
            propriétaire, les fichiers reçus et les déductions
            préliminaires.
          </p>
        </div>

        <span>Rapport préliminaire · ZAMI 2026</span>
      </footer>
    </section>
  );
}

function buildVerificationPoints(
  snapshot: Snapshot | null,
  answers: Answers,
  evidence: Evidence[],
) {
  const points: Array<{
    title: string;
    description: string;
    priority: "high" | "normal";
  }> = [];

  const dpeAvailable =
    snapshot?.dpe?.status === "available" &&
    snapshot?.dpe?.verified === true;

  if (!dpeAvailable) {
    points.push({
      title: "Confirmer la performance énergétique",
      description:
        "Aucun DPE n’a été strictement associé à cette adresse. Un DPE ou un audit doit être fourni avant une estimation énergétique détaillée.",
      priority: "high",
    });
  }

  if (
    answers.property_type === "house" &&
    ["none", "old", "unknown"].includes(
      String(answers.roof_insulation),
    )
  ) {
    points.push({
      title: "Vérifier la toiture ou les combles",
      description:
        "L’état déclaré de l’isolation nécessite une confirmation visuelle ou documentaire avant de prioriser les travaux.",
      priority: "high",
    });
  }

  if (
    ["none", "partial", "unknown"].includes(
      String(answers.wall_insulation),
    )
  ) {
    points.push({
      title: "Identifier la composition des murs",
      description:
        "L’isolation intérieure, extérieure ou l’absence d’isolation doit être confirmée avant toute recommandation.",
      priority: "normal",
    });
  }

  if (
    ["single", "old_double", "mixed"].includes(
      String(answers.windows),
    )
  ) {
    points.push({
      title: "Évaluer les fenêtres existantes",
      description:
        "Le type de vitrage, l’état des cadres et les infiltrations d’air doivent être vérifiés sur place.",
      priority: "normal",
    });
  }

  if (
    ["none", "natural", "unknown"].includes(
      String(answers.ventilation),
    )
  ) {
    points.push({
      title: "Contrôler la ventilation",
      description:
        "Le renouvellement d’air doit être étudié avant de renforcer l’isolation et l’étanchéité du logement.",
      priority: "high",
    });
  }

  if (
    ["oil", "electric"].includes(
      String(answers.heating_system),
    )
  ) {
    points.push({
      title: "Comparer le système de chauffage",
      description:
        "Le remplacement du chauffage doit être étudié après avoir évalué les pertes thermiques et les besoins réels.",
      priority: "normal",
    });
  }

  const hasEnergyBill = evidence.some(
    (item) => item.evidence_type === "energy_bill",
  );

  if (
    !hasEnergyBill &&
    (!answers.annual_energy_bill ||
      answers.annual_energy_bill === "unknown")
  ) {
    points.push({
      title: "Ajouter une consommation énergétique réelle",
      description:
        "Une facture récente permettra de comparer les usages réels avec les futures estimations.",
      priority: "normal",
    });
  }

  if (points.length === 0) {
    points.push({
      title: "Faire confirmer les informations principales",
      description:
        "Le dossier est bien renseigné, mais les éléments techniques doivent encore être validés par documents ou visite.",
      priority: "normal",
    });
  }

  return points.slice(0, 6);
}

function formatAnswer(key: string, value: AnswerValue) {
  if (value === "unknown") {
    return "Information inconnue";
  }

  if (key === "living_surface") {
    return `${value} m²`;
  }

  if (key === "annual_energy_bill") {
    return `${value} € / an`;
  }

  return answerLabels[key]?.[String(value)] || String(value);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function StatusBadge({
  complete,
  label,
}: {
  complete: boolean;
  label: string;
}) {
  return (
    <span
      className={
        complete ? styles.completeBadge : styles.warningBadge
      }
    >
      {complete ? (
        <Check size={13} />
      ) : (
        <AlertTriangle size={13} />
      )}

      {label}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  status,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: "complete" | "warning" | "neutral";
}) {
  return (
    <article className={styles.summaryCard}>
      <span
        className={`${styles.summaryIcon} ${
          status === "complete"
            ? styles.summaryComplete
            : status === "warning"
              ? styles.summaryWarning
              : styles.summaryNeutral
        }`}
      >
        {icon}
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function ReportSection({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.reportSection}>
      <div className={styles.sectionHeading}>
        <span>{icon}</span>

        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
        </div>
      </div>

      {children}
    </section>
  );
}

function SourceLine({
  icon,
  title,
  source,
  status,
  complete,
}: {
  icon: ReactNode;
  title: string;
  source: string;
  status: string;
  complete: boolean;
}) {
  return (
    <div className={styles.sourceLine}>
      <span
        className={
          complete
            ? styles.sourceComplete
            : styles.sourcePending
        }
      >
        {icon}
      </span>

      <div>
        <strong>{title}</strong>
        <small>{source}</small>
      </div>

      <em>{status}</em>
    </div>
  );
}

function EmptyMessage({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.emptyMessage}>
      <Info size={18} />
      <p>{children}</p>
    </div>
  );
}
