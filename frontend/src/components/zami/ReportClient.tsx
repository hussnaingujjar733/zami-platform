"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Gauge,
  Home,
  ImagePlus,
  MapPin,
  Printer,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { RenovationAnalysisCard } from "./RenovationAnalysisCard";
import { RenovationPlanCard } from "./RenovationPlanCard";
import { QuoteCheckCard } from "./QuoteCheckCard";
import styles from "./ReportClient.module.css";

type Answers = Record<string, string | number>;

type Evidence = {
  id: string;
  evidence_type: string;
  original_filename: string;
  file_kind: string;
  size_bytes: number;
  analysis_status?: string;
};

type Snapshot = {
  address?: {
    verified?: boolean;
    status?: string;
    value?: {
      label?: string;
    };
    label?: string;
  };
  dpe?: {
    status?: string;
    verified?: boolean;
    value?: {
      energy_class?: string | null;
      ghg_class?: string | null;
    } | null;
  };
};

type ProjectRecord = {
  id: string;
  status: string;
  address_label: string | null;
  address: Record<string, unknown>;
  snapshot: Snapshot;
  answers: Answers;
  report: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type EvidenceListResponse = {
  project_id: string;
  evidence: Evidence[];
  total: number;
};

type ApiError = {
  detail?: string;
  error?: string;
};

type ReportSyncState =
  | "idle"
  | "saving"
  | "saved"
  | "error";

async function readJsonResponse<T>(
  response: Response,
): Promise<T> {
  const responseText = await response.text();

  if (!responseText) {
    throw new Error(
      `Réponse serveur vide (${response.status}).`,
    );
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(
      `Réponse serveur invalide (${response.status}).`,
    );
  }
}

const answerNames: Record<string, string> = {
  has_dpe_document: "Document énergétique",
  property_type: "Type de logement",
  apartment_floor: "Position dans l’immeuble",
  living_surface: "Surface habitable",
  construction_period: "Période de construction",
  heating_system: "Chauffage principal",
  roof_insulation: "Isolation toiture",
  wall_insulation: "Isolation murs",
  windows: "Fenêtres",
  ventilation: "Ventilation",
  annual_energy_bill: "Facture annuelle",
  primary_objective: "Objectif principal",
};

const valueNames: Record<string, string> = {
  house: "Maison individuelle",
  apartment: "Appartement",
  ground: "Rez-de-chaussée",
  middle: "Étage intermédiaire",
  top: "Dernier étage",
  gas: "Chaudière gaz",
  electric: "Chauffage électrique",
  heat_pump: "Pompe à chaleur",
  oil: "Fioul",
  wood: "Bois ou granulés",
  district: "Chauffage collectif ou réseau",
  single: "Simple vitrage",
  old_double: "Double vitrage ancien",
  recent_double: "Double vitrage récent",
  triple: "Triple vitrage",
  mixed: "Plusieurs types",
  natural: "Ventilation naturelle",
  single_flow: "VMC simple flux",
  double_flow: "VMC double flux",
  none: "Non / absent",
  good: "Récent ou en bon état",
  old: "Ancien",
  partial: "Partiel ou ancien",
  comfort: "Améliorer le confort",
  bills: "Réduire les factures",
  dpe: "Améliorer le DPE",
  sell: "Préparer une vente ou location",
  complete_project: "Rénovation globale",
  quote_check: "Vérifier un devis",
  unknown: "Information inconnue",
};

const evidenceNames: Record<string, string> = {
  dpe: "DPE",
  energy_audit: "Audit énergétique",
  energy_bill: "Facture énergétique",
  quote: "Devis",
  facade: "Photo façade",
  windows: "Photo fenêtres",
  roof_attic: "Photo toiture ou combles",
  heating_system: "Photo chauffage",
  humidity: "Photo humidité",
};

export function ReportClient() {
  const [loaded, setLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [projectId, setProjectId] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [syncState, setSyncState] =
    useState<ReportSyncState>("idle");
  const [loadError, setLoadError] = useState("");
  const [downloadingPdf, setDownloadingPdf] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadReportData() {
      const storedProjectId = window.localStorage.getItem(
        "zami_project_id",
      );

      if (!storedProjectId) {
        loadLocalFallback();
        setLoadError(
          "Projet permanent introuvable. Les données locales sont affichées.",
        );
        setLoaded(true);
        return;
      }

      setProjectId(storedProjectId);

      try {
        const [projectResponse, evidenceResponse] =
          await Promise.all([
            fetch(
              `/api/backend/projects/${encodeURIComponent(
                storedProjectId,
              )}`,
              {
                cache: "no-store",
              },
            ),
            fetch(
              `/api/backend/projects/${encodeURIComponent(
                storedProjectId,
              )}/evidence`,
              {
                cache: "no-store",
              },
            ),
          ]);

        const projectPayload = await readJsonResponse<
          ProjectRecord | ApiError
        >(projectResponse);

        const evidencePayload = await readJsonResponse<
          EvidenceListResponse | ApiError
        >(evidenceResponse);

        if (!projectResponse.ok) {
          const errorPayload = projectPayload as ApiError;

          throw new Error(
            errorPayload.detail ||
              errorPayload.error ||
              "Le projet n’a pas pu être chargé.",
          );
        }

        if (!evidenceResponse.ok) {
          const errorPayload = evidencePayload as ApiError;

          throw new Error(
            errorPayload.detail ||
              errorPayload.error ||
              "Les fichiers du projet n’ont pas pu être chargés.",
          );
        }

        if (cancelled) {
          return;
        }

        const project = projectPayload as ProjectRecord;
        const evidenceResult =
          evidencePayload as EvidenceListResponse;

        setSnapshot(project.snapshot || null);
        setAnswers(project.answers || {});
        setEvidence(evidenceResult.evidence || []);
        setProjectAddress(project.address_label || "");

        window.localStorage.setItem(
          "zami_project_record",
          JSON.stringify(project),
        );

        window.localStorage.setItem(
          "zami_property_snapshot",
          JSON.stringify(project.snapshot || {}),
        );

        window.localStorage.setItem(
          "zami_questionnaire_draft",
          JSON.stringify({
            answers: project.answers || {},
            source_type: "homeowner",
            verification_status:
              "informations_proprietaire_ajoutees",
            updated_at: project.updated_at,
          }),
        );

        window.localStorage.setItem(
          "zami_uploaded_evidence",
          JSON.stringify(evidenceResult.evidence || []),
        );
      } catch (requestError) {
        console.error(
          "Backend report loading failed:",
          requestError,
        );

        if (!cancelled) {
          loadLocalFallback();

          setLoadError(
            requestError instanceof Error
              ? `${requestError.message} Données locales affichées.`
              : "Chargement du projet impossible. Données locales affichées.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    function loadLocalFallback() {
      try {
        const snapshotRaw = window.localStorage.getItem(
          "zami_property_snapshot",
        );

        const questionnaireRaw =
          window.localStorage.getItem(
            "zami_questionnaire_draft",
          );

        const evidenceRaw = window.localStorage.getItem(
          "zami_uploaded_evidence",
        );

        if (snapshotRaw) {
          setSnapshot(
            JSON.parse(snapshotRaw) as Snapshot,
          );
        }

        if (questionnaireRaw) {
          const questionnaire = JSON.parse(
            questionnaireRaw,
          ) as {
            answers?: Answers;
          };

          setAnswers(questionnaire.answers || {});
        }

        if (evidenceRaw) {
          setEvidence(
            JSON.parse(evidenceRaw) as Evidence[],
          );
        }
      } catch {
        setLoadError(
          "Les données locales du rapport sont illisibles.",
        );
      }
    }

    void loadReportData();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (!loaded || !projectId) {
      return;
    }

    const answeredCount = Object.values(answers).filter(
      (value) => value !== "" && value !== undefined,
    ).length;

    const addressVerified =
      snapshot?.address?.verified === true ||
      snapshot?.address?.status === "verified";

    const dpeVerified =
      snapshot?.dpe?.status === "available" &&
      snapshot?.dpe?.verified === true;

    const dossierScore = Math.min(
      100,
      (addressVerified ? 25 : 10) +
        (dpeVerified ? 25 : 0) +
        Math.min(35, answeredCount * 4) +
        Math.min(15, evidence.length * 3),
    );

    const reportPayload = {
      version: "1.0",
      report_type: "preliminary_decision_report",
      generated_at: new Date().toISOString(),
      project_id: projectId,
      address_label:
        projectAddress ||
        snapshot?.address?.value?.label ||
        snapshot?.address?.label ||
        null,
      dossier_score: dossierScore,
      source_summary: {
        address_verified: addressVerified,
        dpe_verified: dpeVerified,
        homeowner_answers: answeredCount,
        evidence_files: evidence.length,
      },
      verification_status: {
        address:
          addressVerified ? "verified" : "to_confirm",
        dpe:
          dpeVerified ? "verified" : "not_confirmed",
        questionnaire: "declared_by_homeowner",
        evidence: evidence.length
          ? "uploaded_analysis_pending"
          : "not_provided",
      },
      limitations: [
        "Ce rapport ne remplace pas un audit énergétique.",
        "Aucun défaut caché n’est diagnostiqué.",
        "Aucun prix de travaux n’est confirmé.",
        "Aucune aide financière n’est garantie.",
      ],
    };

    const timeoutId = window.setTimeout(() => {
      setSyncState("saving");

      void Promise.all([
        fetch(
          `/api/backend/projects/${encodeURIComponent(
            projectId,
          )}/report`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              report: reportPayload,
            }),
          },
        ),
        fetch(
          `/api/backend/projects/${encodeURIComponent(
            projectId,
          )}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "report_ready",
            }),
          },
        ),
      ])
        .then(async ([reportResponse, statusResponse]) => {
          if (!reportResponse.ok) {
            const payload = await readJsonResponse<ApiError>(
              reportResponse,
            );

            throw new Error(
              payload.detail ||
                "Le rapport n’a pas pu être enregistré.",
            );
          }

          if (!statusResponse.ok) {
            const payload = await readJsonResponse<ApiError>(
              statusResponse,
            );

            throw new Error(
              payload.detail ||
                "Le statut du projet n’a pas pu être actualisé.",
            );
          }

          window.localStorage.setItem(
            "zami_report_summary",
            JSON.stringify(reportPayload),
          );

          window.localStorage.setItem(
            "zami_project_sync_status",
            "saved",
          );

          window.localStorage.removeItem(
            "zami_project_sync_error",
          );

          setSyncState("saved");
        })
        .catch((syncError) => {
          console.error(
            "Report project sync failed:",
            syncError,
          );

          window.localStorage.setItem(
            "zami_project_sync_status",
            "error",
          );

          window.localStorage.setItem(
            "zami_project_sync_error",
            syncError instanceof Error
              ? syncError.message
              : "Synchronisation du rapport impossible.",
          );

          setSyncState("error");
        });
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    loaded,
    projectId,
    projectAddress,
    snapshot,
    answers,
    evidence,
  ]);


  async function downloadProjectPdf() {
    if (!projectId) {
      setLoadError(
        "Aucun projet permanent n'est associé au rapport.",
      );
      return;
    }

    setDownloadingPdf(true);
    setLoadError("");

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/report.pdf`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const responseText = await response.text();

        let message =
          `Le PDF n'a pas pu être généré (${response.status}).`;

        try {
          const payload = JSON.parse(responseText) as {
            detail?: string;
          };

          message = payload.detail || message;
        } catch {
          // The default message is retained.
        }

        throw new Error(message);
      }

      const pdfBlob = await response.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `ZAMI_Rapport_${projectId.slice(
        0,
        18,
      )}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1500);
    } catch (downloadError) {
      setLoadError(
        downloadError instanceof Error
          ? downloadError.message
          : "Le téléchargement du rapport a échoué.",
      );
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (!loaded) {
    return (
      <section className={styles.loading}>
        <Gauge size={38} />
        <h1>Préparation du rapport…</h1>
      </section>
    );
  }

  const address =
    projectAddress ||
    snapshot?.address?.value?.label ||
    snapshot?.address?.label ||
    "Logement analysé";

  const addressVerified =
    snapshot?.address?.verified === true ||
    snapshot?.address?.status === "verified";

  const dpeVerified =
    snapshot?.dpe?.status === "available" &&
    snapshot?.dpe?.verified === true;

  const answerEntries = Object.entries(answers).filter(
    ([, value]) => value !== "" && value !== undefined,
  );

  const score = Math.min(
    100,
    (addressVerified ? 25 : 10) +
      (dpeVerified ? 25 : 0) +
      Math.min(35, answerEntries.length * 4) +
      Math.min(15, evidence.length * 3),
  );

  return (
    <section className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/analyse/documents">
          <ArrowLeft size={16} />
          Retour aux documents
        </Link>

        <button
          type="button"
          disabled={downloadingPdf || !projectId}
          onClick={() => void downloadProjectPdf()}
        >
          <Printer size={16} />

          {downloadingPdf
            ? "Génération du PDF…"
            : "Télécharger le rapport PDF"}
        </button>
      </div>

      {loadError && (
        <div className={styles.dataWarning}>
          <AlertTriangle size={16} />
          {loadError}
        </div>
      )}

      {projectId && (
        <div className={styles.syncStatus}>
          <ShieldCheck size={15} />

          {syncState === "saving"
            ? "Enregistrement du rapport dans le projet…"
            : syncState === "error"
              ? "Rapport disponible localement · synchronisation en attente"
              : "Rapport associé au projet permanent"}
        </div>
      )}

      <header className={styles.header}>
        <div>
          <span>Rapport préliminaire ZAMI</span>
          <h1>{address}</h1>

          <p>
            Synthèse des données officielles, des informations
            déclarées et des preuves ajoutées au dossier.
          </p>
        </div>

        <aside>
          <small>Préparation du dossier</small>
          <strong>{score}%</strong>

          <div>
            <i style={{ width: `${score}%` }} />
          </div>

          <p>
            Ce score indique la quantité d’informations disponibles,
            pas la qualité énergétique du logement.
          </p>
        </aside>
      </header>

      <div className={styles.statusGrid}>
        <StatusCard
          icon={<MapPin size={21} />}
          title="Adresse"
          value={
            addressVerified
              ? "Adresse officielle vérifiée"
              : "Adresse à confirmer"
          }
          complete={addressVerified}
        />

        <StatusCard
          icon={<Gauge size={21} />}
          title="DPE"
          value={
            dpeVerified
              ? `Classe ${
                  snapshot?.dpe?.value?.energy_class || "confirmée"
                }`
              : "Aucun DPE strictement associé"
          }
          complete={dpeVerified}
        />

        <StatusCard
          icon={<UserRound size={21} />}
          title="Questionnaire"
          value={`${answerEntries.length} réponses enregistrées`}
          complete={answerEntries.length >= 6}
        />

        <StatusCard
          icon={<FileText size={21} />}
          title="Preuves"
          value={`${evidence.length} fichier${
            evidence.length > 1 ? "s" : ""
          } ajouté${evidence.length > 1 ? "s" : ""}`}
          complete={evidence.length > 0}
        />
      </div>

      {projectId && (
        <>
          <RenovationAnalysisCard
            projectId={projectId}
          />

          <RenovationPlanCard
            projectId={projectId}
          />

          <QuoteCheckCard
            projectId={projectId}
          />
        </>
      )}

      <div className={styles.contentGrid}>
        <main>
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <Home size={21} />

              <div>
                <span>Profil du logement</span>
                <h2>Informations propriétaire</h2>
              </div>
            </div>

            {answerEntries.length ? (
              <div className={styles.factGrid}>
                {answerEntries.map(([key, value]) => (
                  <div key={key}>
                    <span>{answerNames[key] || key}</span>

                    <strong>
                      {formatAnswer(key, value)}
                    </strong>

                    <small>
                      Source : déclaration propriétaire
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Le questionnaire n’a pas encore été complété." />
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <FileText size={21} />

              <div>
                <span>Documents et photographies</span>
                <h2>Preuves ajoutées au dossier</h2>
              </div>
            </div>

            {evidence.length ? (
              <div className={styles.fileList}>
                {evidence.map((item) => (
                  <article key={item.id}>
                    <span className={styles.fileIcon}>
                      {item.file_kind === "pdf" ? (
                        <FileText size={19} />
                      ) : (
                        <ImagePlus size={19} />
                      )}
                    </span>

                    <div>
                      <strong>{item.original_filename}</strong>

                      <small>
                        {evidenceNames[item.evidence_type] ||
                          item.evidence_type}
                        {" · "}
                        {formatSize(item.size_bytes)}
                      </small>
                    </div>

                    <em>Analyse en attente</em>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Aucun document ou aucune photo n’a été ajouté. Le rapport reste néanmoins disponible." />
            )}
          </section>
        </main>

        <aside className={styles.sideColumn}>
          <section className={styles.sideCard}>
            <ShieldCheck size={23} />

            <h2>Traçabilité</h2>

            <SourceLine
              label="Adresse"
              value={
                addressVerified
                  ? "Donnée officielle vérifiée"
                  : "Confirmation nécessaire"
              }
              complete={addressVerified}
            />

            <SourceLine
              label="DPE"
              value={
                dpeVerified
                  ? "Association stricte confirmée"
                  : "Non confirmé"
              }
              complete={dpeVerified}
            />

            <SourceLine
              label="Questionnaire"
              value="Déclaration propriétaire"
              complete={false}
            />

            <SourceLine
              label="Fichiers"
              value="Reçus, analyse en attente"
              complete={false}
            />
          </section>

          <section className={styles.warningCard}>
            <AlertTriangle size={22} />

            <h2>Limites importantes</h2>

            <ul>
              <li>
                Ce rapport ne remplace pas un audit énergétique.
              </li>
              <li>
                Une photo ne confirme pas un défaut caché.
              </li>
              <li>
                Aucun prix de travaux n’est encore validé.
              </li>
              <li>
                Aucune aide financière n’est garantie.
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <footer className={styles.footer}>
        <ShieldCheck size={18} />

        <p>
          ZAMI sépare les données officielles, les déclarations du
          propriétaire et les fichiers dont l’analyse reste en
          attente.
        </p>

        <span>Rapport ZAMI · 2026</span>
      </footer>
    </section>
  );
}

function StatusCard({
  icon,
  title,
  value,
  complete,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  complete: boolean;
}) {
  return (
    <article className={styles.statusCard}>
      <span
        className={
          complete
            ? styles.statusComplete
            : styles.statusPending
        }
      >
        {icon}
      </span>

      <div>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SourceLine({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className={styles.sourceLine}>
      {complete ? (
        <CheckCircle2 size={17} />
      ) : (
        <AlertTriangle size={17} />
      )}

      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className={styles.emptyState}>
      <AlertTriangle size={18} />
      <p>{text}</p>
    </div>
  );
}

function formatAnswer(
  key: string,
  value: string | number,
) {
  if (key === "living_surface") {
    return `${value} m²`;
  }

  if (key === "annual_energy_bill") {
    return `${value} € / an`;
  }

  return valueNames[String(value)] || String(value);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
