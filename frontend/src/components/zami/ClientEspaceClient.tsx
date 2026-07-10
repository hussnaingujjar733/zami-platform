"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Home,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ClientProjectProgressBox } from "./ClientProjectProgressBox";
import { ClientProjectOfferCard } from "./ClientProjectOfferCard";
import { ClientProjectPhotosGallery } from "./ClientProjectPhotosGallery";

import styles from "./ClientEspaceClient.module.css";

type ClientProject = {
  id: string;
  public_reference?: string;
  status: string;
  project_type: string;
  address: string;
  city?: string;
  property_type?: string;
  surface_m2?: number | null;
  dpe_class?: string;
  urgency?: string;
  has_quote?: boolean;
  has_artisan?: boolean;
  budget_range?: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  preferred_contact?: string;
  next_action?: string;
  client_public_note?: string;
  client_requested_action?: string;
  created_at?: string;
  updated_at?: string;
};

type ClientDocument = {
  id: string;
  managed_project_id: string;
  document_type: string;
  original_filename: string;
  file_kind: string;
  size_bytes: number;
  created_at: string;
};

type ClientBrief = {
  readiness_score: number;
  risk_level: string;
  summary: string;
  missing_documents: string[];
  priority_actions: string[];
  updated_at: string;
};

type ClientProjectResponse = {
  project?: ClientProject;
  documents?: ClientDocument[];
  brief?: ClientBrief | null;
  detail?: string;
};

const timeline = [
  { key: "received", label: "Demande reçue" },
  { key: "documents_needed", label: "Documents à compléter" },
  { key: "ready_for_review", label: "Dossier prêt pour revue" },
  { key: "contractor_matching", label: "Recherche de professionnels" },
  { key: "quote_collection", label: "Collecte de devis" },
  { key: "client_decision", label: "Décision client" },
  { key: "closed", label: "Projet clôturé" },
];

export function ClientEspaceClient() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();

  const projectId = params.projectId;
  const token = searchParams.get("token") || "";

  const [project, setProject] = useState<ClientProject | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [brief, setBrief] = useState<ClientBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState("dpe");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  async function loadClientProject() {
    if (!projectId || !token) {
      setError("Lien client invalide ou incomplet.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/client-projects/${projectId}?token=${encodeURIComponent(
          token,
        )}`,
        {
          cache: "no-store",
        },
      );

      const data = (await response.json()) as ClientProjectResponse;

      if (!response.ok || !data.project) {
        throw new Error(data.detail || "Impossible de charger votre espace.");
      }

      setProject(data.project);
      setDocuments(data.documents || []);
      setBrief(data.brief || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant le chargement.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadDocument() {
    if (!projectId || !token || !documentFile) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("file", documentFile);

      const response = await fetch(
        `/api/backend/client-projects/${projectId}/documents?token=${encodeURIComponent(
          token,
        )}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible d’ajouter le document.");
      }

      setDocumentFile(null);
      await loadClientProject();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Erreur pendant l’ajout du document.",
      );
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    void loadClientProject();
  }, [projectId, token]);

  const currentStepIndex = useMemo(() => {
    const index = timeline.findIndex((step) => step.key === project?.status);
    return index >= 0 ? index : 0;
  }, [project?.status]);

  if (loading) {
    return (
      <section className={styles.page}>
        <div className={styles.stateBox}>
          <LoaderCircle size={20} className={styles.spinner} />
          Chargement de votre suivi de demande...
        </div>
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className={styles.page}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          Retour à l’accueil
        </Link>

        <div className={styles.errorHero}>
          <AlertCircle size={28} />
          <h1>Suivi de demande indisponible</h1>
          <p>{error || "Lien invalide."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      <header className={styles.hero}>
        <div>
          <span>Suivi de votre demande ZAMI</span>

          <h1>Votre demande est suivie par ZAMI</h1>

          <p>
            Suivez l’avancement de votre dossier, ajoutez vos documents et
            consultez les prochaines étapes recommandées.
          </p>
        </div>

        <button type="button" onClick={() => void loadClientProject()}>
          <RefreshCw size={16} />
          Actualiser
        </button>
      </header>

      <div className={styles.overviewGrid}>
        <article>
          <small>Numéro de demande</small>
          <strong>{project.public_reference || project.id}</strong>
        </article>

        <article>
          <small>Statut actuel</small>
          <strong>{statusLabel(project.status)}</strong>
        </article>

        <article>
          <small>Dossier</small>
          <strong>
            {brief ? `${brief.readiness_score}/100` : "En préparation"}
          </strong>
        </article>

        <article>
          <small>Documents</small>
          <strong>{documents.length}</strong>
        </article>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span>
              <ShieldCheck size={15} />
              Progression
            </span>
            <h2>Avancement de votre dossier</h2>
          </div>
        </div>

        <div className={styles.timeline}>
          {timeline.map((step, index) => {
            const isDone = index <= currentStepIndex;

            return (
              <article
                key={step.key}
                className={isDone ? styles.stepDone : styles.step}
              >
                <CheckCircle2 size={17} />
                <span>{step.label}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span>
              <Home size={15} />
              Votre logement
            </span>
            <h2>Résumé du projet</h2>
          </div>
        </div>

        <div className={styles.projectSummary}>
          <p>
            <strong>Adresse:</strong> {project.address} {project.city || ""}
          </p>

          <p>
            <strong>Type de projet:</strong>{" "}
            {projectTypeLabel(project.project_type)}
          </p>

          <p>
            <strong>Urgence:</strong> {urgencyLabel(project.urgency)}
          </p>

          <p>
            <strong>Description:</strong>{" "}
            {project.description || "Non précisée."}
          </p>
        </div>

        {project.next_action && (
          <div className={styles.nextAction}>
            <strong>Prochaine étape ZAMI</strong>
            <p>{project.next_action}</p>
          </div>
        )}
      </section>

      {brief && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span>Analyse ZAMI</span>
              <h2>Préparation du dossier</h2>
            </div>
          </div>

          <div className={styles.briefBox}>
            <strong>{brief.risk_level}</strong>
            <p>{brief.summary}</p>
          </div>

          {brief.missing_documents.length > 0 && (
            <div className={styles.listBox}>
              <h3>Documents recommandés</h3>

              <ul>
                {brief.missing_documents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {brief.priority_actions.length > 0 && (
            <div className={styles.listBox}>
              <h3>Actions prioritaires</h3>

              <ul>
                {brief.priority_actions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <span>
              <FileUp size={15} />
              Documents
            </span>

            <h2>Documents de votre dossier</h2>
          </div>
        </div>

        <div className={styles.uploadBox}>
          <div className={styles.uploadGrid}>
            <label>
              Type de document
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
              >
                <option value="dpe">DPE</option>
                <option value="quote">Devis</option>
                <option value="photo">Photos du logement</option>
                <option value="energy_bill">Facture énergie</option>
                <option value="audit">Audit énergétique</option>
                <option value="plan">Plan</option>
                <option value="other">Autre</option>
              </select>
            </label>

            <label>
              Fichier
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt"
                onChange={(event) =>
                  setDocumentFile(event.target.files?.[0] || null)
                }
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void uploadDocument()}
            disabled={!documentFile || uploading}
          >
            <Upload size={15} />
            {uploading ? "Ajout en cours..." : "Ajouter au dossier"}
          </button>
        </div>

        {documents.length === 0 ? (
          <p className={styles.muted}>
            Aucun document ajouté pour le moment.
          </p>
        ) : (
          <div className={styles.documentList}>
            {documents.map((document) => (
              <article key={document.id}>
                <strong>{documentTypeLabel(document.document_type)}</strong>
                <span>{document.original_filename}</span>
                <small>{formatSize(document.size_bytes)}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    received: "Demande reçue",
    documents_needed: "Documents à compléter",
    ready_for_review: "Dossier prêt pour revue",
    contractor_matching: "Recherche de professionnels",
    quote_collection: "Collecte de devis",
    client_decision: "Décision client",
    closed: "Projet clôturé",
  };

  return labels[value || ""] || "Demande reçue";
}

function projectTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    renovation_complete: "Rénovation complète",
    insulation: "Isolation",
    windows: "Fenêtres / menuiseries",
    heating: "Chauffage",
    ventilation: "Ventilation",
    unknown: "Je ne sais pas encore",
  };

  return labels[value || ""] || value || "Non précisé";
}

function urgencyLabel(value?: string) {
  const labels: Record<string, string> = {
    this_week: "Cette semaine",
    this_month: "Ce mois-ci",
    three_months: "Dans 3 mois",
    not_urgent: "Pas urgent",
  };

  return labels[value || ""] || value || "Non précisée";
}

function documentTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    dpe: "DPE",
    quote: "Devis",
    photo: "Photo",
    energy_bill: "Facture énergie",
    audit: "Audit énergétique",
    plan: "Plan",
    other: "Autre",
  };

  return labels[value || ""] || value || "Document";
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Taille inconnue";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
