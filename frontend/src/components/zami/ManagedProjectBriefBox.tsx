"use client";

import { Download, FileText, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./ManagedProjectBriefBox.module.css";

type ManagedBrief = {
  id: string;
  managed_project_id: string;
  readiness_score: number;
  risk_level: string;
  summary: string;
  missing_documents: string[];
  priority_actions: string[];
  contractor_questions: string[];
  homeowner_message: string;
  metadata: {
    document_count?: number;
    document_types?: string[];
  };
  updated_at: string;
};

type BriefResponse = {
  success?: boolean;
  brief?: ManagedBrief | null;
  detail?: string;
};

type Props = {
  projectId: string;
  accessKey: string;
};

export function ManagedProjectBriefBox({ projectId, accessKey }: Props) {
  const [brief, setBrief] = useState<ManagedBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadBrief() {
    if (!projectId || !accessKey) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${projectId}/brief`,
        {
          cache: "no-store",
          headers: {
            "X-ZAMI-Team-Key": accessKey,
          },
        },
      );

      const data = (await response.json()) as BriefResponse;

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de charger le brief.");
      }

      setBrief(data.brief || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant le chargement du brief.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadBriefPdf() {
    if (!projectId || !accessKey) {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${projectId}/brief/report.pdf`,
        {
          headers: {
            "X-ZAMI-Team-Key": accessKey,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Impossible de télécharger le PDF.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");

      anchor.href = url;
      anchor.download = `zami-dossier-projet-${projectId}.pdf`;
      anchor.click();

      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant le téléchargement du PDF.",
      );
    }
  }

  async function generateBrief() {
    if (!projectId || !accessKey) {
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${projectId}/brief/run`,
        {
          method: "POST",
          headers: {
            "X-ZAMI-Team-Key": accessKey,
          },
        },
      );

      const data = (await response.json()) as BriefResponse;

      if (!response.ok || !data.brief) {
        throw new Error(data.detail || "Impossible de générer le brief.");
      }

      setBrief(data.brief);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la génération.",
      );
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    void loadBrief();
  }, [projectId, accessKey]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <span>
            <Sparkles size={14} />
            Brief projet ZAMI
          </span>

          <h3>Brief projet ZAMI</h3>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => void generateBrief()}
            disabled={generating}
          >
            {generating ? (
              <>
                <RefreshCw size={14} />
                Génération...
              </>
            ) : (
              <>
                <FileText size={14} />
                Générer le brief
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void downloadBriefPdf()}
          >
            <Download size={14} />
            Télécharger PDF
          </button>
        </div>
      </div>

      {loading && <p className={styles.muted}>Chargement du brief...</p>}

      {error && <p className={styles.error}>{error}</p>}

      {!loading && !brief && !error && (
        <p className={styles.muted}>
          Aucun brief généré pour ce lead. Cliquez sur “Générer le brief”.
        </p>
      )}

      {brief && (
        <div className={styles.content}>
          <div className={styles.scoreRow}>
            <article>
              <strong>{brief.readiness_score}/100</strong>
              <span>Score préparation</span>
            </article>

            <article>
              <strong>{brief.risk_level}</strong>
              <span>Niveau dossier</span>
            </article>
          </div>

          <div className={styles.section}>
            <h4>Résumé</h4>
            <p>{brief.summary}</p>
          </div>

          <div className={styles.section}>
            <h4>Documents manquants</h4>

            {brief.missing_documents.length === 0 ? (
              <p>Aucun document critique manquant détecté.</p>
            ) : (
              <ul>
                {brief.missing_documents.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.section}>
            <h4>Actions prioritaires</h4>
            <ul>
              {brief.priority_actions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.section}>
            <h4>Questions à poser</h4>
            <ul>
              {brief.contractor_questions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.messageBox}>
            <h4>Message client prêt à envoyer</h4>
            <pre>{brief.homeowner_message}</pre>
          </div>
        </div>
      )}
    </section>
  );
}
