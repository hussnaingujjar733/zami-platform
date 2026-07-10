"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  FolderOpen,
  Gauge,
  Home,
  LoaderCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import styles from "./SavedProjects.module.css";

type ProjectRecord = {
  id: string;
  status: string;
  address_label: string | null;
  address: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  answers: Record<string, unknown>;
  report: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ProjectsResponse = {
  projects: ProjectRecord[];
  total: number;
};

type EvidenceResponse = {
  project_id: string;
  evidence: Record<string, unknown>[];
  total: number;
};

type ApiError = {
  detail?: string;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  if (!responseText) {
    throw new Error(`Réponse serveur vide (${response.status}).`);
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`Réponse serveur invalide (${response.status}).`);
  }
}

export function SavedProjects() {
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingProjectId, setOpeningProjectId] = useState("");
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/backend/projects?limit=100",
        {
          cache: "no-store",
        },
      );

      const payload = await readJson<
        ProjectsResponse | ApiError
      >(response);

      if (!response.ok) {
        const errorPayload = payload as ApiError;

        throw new Error(
          errorPayload.detail ||
            errorPayload.error ||
            "Les projets n’ont pas pu être chargés.",
        );
      }

      setProjects(
        (payload as ProjectsResponse).projects || [],
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function openProject(
    project: ProjectRecord,
    requestedDestination?: "report",
  ) {
    setOpeningProjectId(project.id);
    setError("");

    try {
      const evidenceResponse = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          project.id,
        )}/evidence`,
        {
          cache: "no-store",
        },
      );

      const evidencePayload = await readJson<
        EvidenceResponse | ApiError
      >(evidenceResponse);

      if (!evidenceResponse.ok) {
        const errorPayload = evidencePayload as ApiError;

        throw new Error(
          errorPayload.detail ||
            errorPayload.error ||
            "Les documents du projet n’ont pas pu être chargés.",
        );
      }

      const evidence =
        (evidencePayload as EvidenceResponse).evidence || [];

      restoreProjectLocally(project, evidence);

      if (
        requestedDestination === "report" ||
        project.status === "report_ready" ||
        Object.keys(project.report || {}).length > 0
      ) {
        router.push("/analyse/report");
        return;
      }

      if (Object.keys(project.answers || {}).length > 0) {
        router.push("/analyse/documents");
        return;
      }

      router.push("/analyse/questions");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le projet n’a pas pu être ouvert.",
      );

      setOpeningProjectId("");
    }
  }

  if (loading) {
    return (
      <section className={styles.loading}>
        <LoaderCircle size={38} className={styles.spinner} />
        <h1>Chargement de vos projets…</h1>
        <p>Récupération des dossiers enregistrés.</p>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            Espace projets
          </span>

          <h1>Mes projets de rénovation</h1>

          <p>
            Retrouvez vos analyses, complétez les informations
            manquantes et consultez les rapports enregistrés.
          </p>
        </div>

        <Link href="/" className={styles.newProjectButton}>
          <Plus size={17} />
          Nouvelle analyse
        </Link>
      </header>

      <div className={styles.summary}>
        <SummaryCard
          icon={<FolderOpen size={21} />}
          label="Projets enregistrés"
          value={projects.length}
        />

        <SummaryCard
          icon={<CheckCircle2 size={21} />}
          label="Rapports prêts"
          value={
            projects.filter(
              (project) =>
                project.status === "report_ready" ||
                Object.keys(project.report || {}).length > 0,
            ).length
          }
        />

        <SummaryCard
          icon={<FileText size={21} />}
          label="Dossiers en cours"
          value={
            projects.filter(
              (project) =>
                project.status !== "report_ready" &&
                Object.keys(project.report || {}).length === 0,
            ).length
          }
        />
      </div>

      <div className={styles.toolbar}>
        <div>
          <h2>Dossiers enregistrés</h2>
          <p>
            Les données sont récupérées depuis le backend ZAMI.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadProjects()}
        >
          <RefreshCw size={15} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={17} />
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <Home size={34} />

          <h2>Aucun projet enregistré</h2>

          <p>
            Lancez une analyse officielle d’adresse pour créer votre
            premier dossier de rénovation.
          </p>

          <Link href="/">
            Commencer une analyse
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className={styles.projectGrid}>
          {projects.map((project) => {
            const answersCount = Object.values(
              project.answers || {},
            ).filter(
              (value) =>
                value !== "" &&
                value !== null &&
                value !== undefined,
            ).length;

            const reportReady =
              project.status === "report_ready" ||
              Object.keys(project.report || {}).length > 0;

            const score = getDossierScore(project);
            const dpeClass = getDpeClass(project);

            return (
              <article
                key={project.id}
                className={styles.projectCard}
              >
                <div className={styles.projectTop}>
                  <span className={styles.propertyIcon}>
                    {getPropertyType(project) === "house" ? (
                      <Home size={22} />
                    ) : (
                      <Building2 size={22} />
                    )}
                  </span>

                  <StatusBadge ready={reportReady} />
                </div>

                <div className={styles.projectAddress}>
                  <small>Projet ZAMI</small>

                  <h2>
                    {project.address_label ||
                      "Adresse non renseignée"}
                  </h2>

                  <p>
                    Mis à jour le{" "}
                    {formatDate(project.updated_at)}
                  </p>
                </div>

                <div className={styles.projectFacts}>
                  <div>
                    <span>DPE</span>
                    <strong>{dpeClass || "Non confirmé"}</strong>
                  </div>

                  <div>
                    <span>Questionnaire</span>
                    <strong>{answersCount} réponses</strong>
                  </div>

                  <div>
                    <span>Préparation</span>
                    <strong>
                      {typeof score === "number"
                        ? `${score}%`
                        : reportReady
                          ? "Terminé"
                          : "En cours"}
                    </strong>
                  </div>
                </div>

                <div className={styles.projectActions}>
                  <button
                    type="button"
                    disabled={openingProjectId === project.id}
                    onClick={() => void openProject(project)}
                  >
                    {openingProjectId === project.id ? (
                      <LoaderCircle
                        size={16}
                        className={styles.spinner}
                      />
                    ) : (
                      <FolderOpen size={16} />
                    )}

                    {reportReady
                      ? "Ouvrir le projet"
                      : "Continuer"}
                  </button>

                  {reportReady && (
                    <button
                      type="button"
                      className={styles.reportButton}
                      disabled={
                        openingProjectId === project.id
                      }
                      onClick={() =>
                        void openProject(project, "report")
                      }
                    >
                      <Gauge size={16} />
                      Rapport
                    </button>
                  )}
                </div>

                <footer>
                  <span>{shortProjectId(project.id)}</span>
                  <span>
                    Créé le {formatDate(project.created_at)}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className={styles.summaryCard}>
      <span>{icon}</span>

      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span
      className={
        ready ? styles.readyBadge : styles.progressBadge
      }
    >
      {ready ? (
        <CheckCircle2 size={13} />
      ) : (
        <LoaderCircle size={13} />
      )}

      {ready ? "Rapport prêt" : "En cours"}
    </span>
  );
}

function restoreProjectLocally(
  project: ProjectRecord,
  evidence: Record<string, unknown>[],
) {
  window.localStorage.setItem(
    "zami_project_id",
    project.id,
  );

  window.localStorage.setItem(
    "zami_project_address_label",
    project.address_label || "",
  );

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
    JSON.stringify(evidence),
  );

  window.localStorage.setItem(
    "zami_project_sync_status",
    "saved",
  );

  window.localStorage.removeItem(
    "zami_project_sync_error",
  );
}

function getDpeClass(project: ProjectRecord) {
  const dpe = project.snapshot?.dpe;

  if (!dpe || typeof dpe !== "object") {
    return null;
  }

  const value = (dpe as Record<string, unknown>).value;

  if (!value || typeof value !== "object") {
    return null;
  }

  const energyClass = (
    value as Record<string, unknown>
  ).energy_class;

  return typeof energyClass === "string"
    ? energyClass
    : null;
}

function getPropertyType(project: ProjectRecord) {
  const propertyType = project.answers?.property_type;

  return typeof propertyType === "string"
    ? propertyType
    : "";
}

function getDossierScore(project: ProjectRecord) {
  const score = project.report?.dossier_score;

  return typeof score === "number" ? score : null;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function shortProjectId(projectId: string) {
  if (projectId.length <= 18) {
    return projectId;
  }

  return `${projectId.slice(0, 14)}…`;
}
