"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, FileSignature, XCircle } from "lucide-react";

import styles from "./ClientProjectOfferCard.module.css";

type ClientProject = {
  public_reference?: string;
  zami_offer_status?: string;
  zami_offer_title?: string;
  zami_offer_summary?: string;
  zami_offer_amount_eur?: number | null;
  zami_offer_start_date?: string;
  zami_offer_duration?: string;
  zami_offer_decision_at?: string | null;
};

type ApiResponse = {
  project?: ClientProject;
  detail?: string;
};

export function ClientProjectOfferCard({
  projectIdOverride,
  tokenOverride,
}: {
  projectIdOverride?: string;
  tokenOverride?: string;
} = {}) {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawProjectId = params.projectId;
  const projectId =
    projectIdOverride ||
    (Array.isArray(rawProjectId)
      ? rawProjectId[0]
      : String(rawProjectId || ""));

  const token = tokenOverride || searchParams.get("token") || "";

  const [project, setProject] = useState<ClientProject | null>(null);
  const [decisionLoading, setDecisionLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId || !token) {
      return;
    }

    async function loadOffer() {
      const response = await fetch(
        `/api/backend/client-projects/${projectId}?token=${encodeURIComponent(
          token,
        )}`,
      );

      if (response.ok) {
        const data = (await response.json()) as ApiResponse;
        setProject(data.project || null);
      }
    }

    void loadOffer();
  }, [projectId, token]);

  async function decide(decision: "accepted" | "rejected") {
    setDecisionLoading(decision);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/client-projects/${projectId}/offer-decision?token=${encodeURIComponent(
          token,
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision }),
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de valider la décision.");
      }

      setProject(data.project || null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la décision.",
      );
    } finally {
      setDecisionLoading("");
    }
  }

  if (!project || !project.zami_offer_status || project.zami_offer_status === "draft") {
    return null;
  }

  const status = project.zami_offer_status;

  return (
    <section className={styles.card}>
      <div className={styles.heading}>
        <FileSignature size={18} />
        <div>
          <span>Offre ZAMI</span>
          <h2>{project.zami_offer_title || "Votre offre personnalisée"}</h2>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div>
          <small>Montant proposé</small>
          <strong>
            {project.zami_offer_amount_eur
              ? `${project.zami_offer_amount_eur.toLocaleString("fr-FR")} €`
              : "À confirmer"}
          </strong>
        </div>

        <div>
          <small>Démarrage prévu</small>
          <strong>{project.zami_offer_start_date || "À planifier"}</strong>
        </div>

        <div>
          <small>Durée estimée</small>
          <strong>{project.zami_offer_duration || "À confirmer"}</strong>
        </div>

        <div>
          <small>Statut</small>
          <strong>{status}</strong>
        </div>
      </div>

      {project.zami_offer_summary && (
        <p className={styles.summary}>{project.zami_offer_summary}</p>
      )}

      {status === "sent" && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => void decide("accepted")}
            disabled={Boolean(decisionLoading)}
          >
            <CheckCircle2 size={15} />
            {decisionLoading === "accepted" ? "Validation..." : "Accepter l’offre"}
          </button>

          <button
            type="button"
            onClick={() => void decide("rejected")}
            disabled={Boolean(decisionLoading)}
          >
            <XCircle size={15} />
            {decisionLoading === "rejected" ? "Refus..." : "Refuser"}
          </button>
        </div>
      )}

      {status === "accepted" && (
        <div className={styles.acceptedBox}>
          <p>
            Offre acceptée. ZAMI va organiser les prochaines étapes.
          </p>

          {project.public_reference && (
            <a
              href={`/login?reference=${encodeURIComponent(
                project.public_reference,
              )}`}
            >
              Créer mon compte client
            </a>
          )}
        </div>
      )}

      {status === "rejected" && (
        <p className={styles.rejected}>
          Offre refusée. ZAMI peut reprendre contact pour ajuster la proposition.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
