"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./QuoteCheckCard.module.css";

type FieldCheck = {
  code: string;
  label: string;
  present: boolean;
  matched_keywords: string[];
};

type RedFlag = {
  severity: "high" | "medium" | "low" | string;
  title: string;
  detail: string;
};

type WorkCategory = {
  code: string;
  matched_keywords: string[];
};

type DetectedAmount = {
  amount_eur: number;
  context: string;
};

type QuoteCheck = {
  status: string;
  generated_at: string;
  project_id: string;
  quote_file: {
    evidence_id: string;
    filename: string;
    size_bytes: number;
    sha256: string;
  };
  quality_score: number;
  detected_amounts: DetectedAmount[];
  work_categories: WorkCategory[];
  field_checks: FieldCheck[];
  red_flags: RedFlag[];
  decision: {
    ready_for_signature: boolean;
    human_review_required: boolean;
    reason: string;
  };
  limitations: string[];
};

type QuoteCheckResponse = {
  success?: boolean;
  status?: string;
  quote_check?: QuoteCheck;
};

type ApiError = {
  detail?:
    | string
    | {
        code?: string;
        message?: string;
        missing?: string[];
      };
};

const categoryLabels: Record<string, string> = {
  isolation_toiture_combles: "Isolation toiture / combles",
  isolation_murs: "Isolation murs",
  fenetres_menuiseries: "Fenêtres / menuiseries",
  chauffage: "Chauffage",
  ventilation: "Ventilation",
  audit_dpe: "Audit / DPE",
};

const missingLabels: Record<string, string> = {
  quote_pdf: "Devis PDF",
  quote_file: "Fichier devis",
  extractable_pdf_text: "Texte extractible dans le PDF",
};

export function QuoteCheckCard({
  projectId,
}: {
  projectId: string;
}) {
  const [quoteCheck, setQuoteCheck] =
    useState<QuoteCheck | null>(null);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadExistingCheck() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/backend/projects/${encodeURIComponent(
            projectId,
          )}/quote-check`,
          {
            cache: "no-store",
          },
        );

        if (response.status === 404) {
          return;
        }

        const payload = await readPayload<
          QuoteCheckResponse | ApiError
        >(response);

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              payload as ApiError,
              response.status,
            ),
          );
        }

        if (!cancelled) {
          setQuoteCheck(
            (payload as QuoteCheckResponse).quote_check ||
              null,
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "La vérification du devis n’a pas pu être chargée.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadExistingCheck();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function runQuoteCheck() {
    setRunning(true);
    setError("");
    setMissing([]);

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/quote-check/run`,
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const payload = await readPayload<
        QuoteCheckResponse | ApiError
      >(response);

      if (!response.ok) {
        const errorPayload = payload as ApiError;

        if (
          typeof errorPayload.detail === "object" &&
          Array.isArray(errorPayload.detail.missing)
        ) {
          setMissing(errorPayload.detail.missing);
        }

        throw new Error(
          extractErrorMessage(errorPayload, response.status),
        );
      }

      const result = (payload as QuoteCheckResponse)
        .quote_check;

      if (!result) {
        throw new Error(
          "Le serveur n’a retourné aucun résultat.",
        );
      }

      setQuoteCheck(result);

      window.localStorage.setItem(
        "zami_quote_check",
        JSON.stringify(result),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La vérification du devis a échoué.",
      );
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.card}>
        <div className={styles.loading}>
          <LoaderCircle
            size={24}
            className={styles.spinner}
          />

          <div>
            <strong>Chargement du contrôle devis…</strong>
            <small>
              Recherche d’une vérification enregistrée.
            </small>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <header className={styles.heading}>
        <span>
          <FileSearch size={22} />
        </span>

        <div>
          <small>Contrôle préliminaire de devis</small>
          <h2>Vérification du devis travaux</h2>

          <p>
            ZAMI détecte les montants, les mentions utiles et les
            signaux d’alerte. Ce contrôle ne remplace pas une revue
            juridique ou technique.
          </p>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void runQuoteCheck()}
        >
          {running ? (
            <LoaderCircle
              size={16}
              className={styles.spinner}
            />
          ) : (
            <RefreshCw size={16} />
          )}

          {quoteCheck
            ? "Revérifier le devis"
            : "Vérifier le devis"}
        </button>
      </header>

      {error && (
        <div className={styles.error}>
          <ShieldAlert size={18} />

          <div>
            <strong>Contrôle indisponible</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className={styles.missing}>
          <strong>Élément nécessaire</strong>

          <div>
            {missing.map((item) => (
              <span key={item}>
                <AlertTriangle size={13} />
                {missingLabels[item] || item}
              </span>
            ))}
          </div>
        </div>
      )}

      {!quoteCheck && !error && (
        <div className={styles.empty}>
          <FileSearch size={25} />

          <div>
            <strong>Aucun devis vérifié</strong>
            <p>
              Ajoutez un devis PDF dans les documents avec le type
              “Devis”, puis lancez la vérification.
            </p>
          </div>
        </div>
      )}

      {quoteCheck && (
        <>
          <div className={styles.scoreRow}>
            <div className={styles.scoreBox}>
              <small>Score qualité du devis</small>
              <strong>{quoteCheck.quality_score}%</strong>
              <span>{statusLabel(quoteCheck.status)}</span>
            </div>

            <div className={styles.fileBox}>
              <small>Fichier analysé</small>
              <strong>{quoteCheck.quote_file.filename}</strong>
              <span>
                {formatSize(quoteCheck.quote_file.size_bytes)}
              </span>
            </div>
          </div>

          {quoteCheck.detected_amounts.length > 0 && (
            <div className={styles.amounts}>
              <strong>Montants détectés</strong>

              <div>
                {quoteCheck.detected_amounts.map((item) => (
                  <article key={`${item.amount_eur}-${item.context}`}>
                    <span>{formatCurrency(item.amount_eur)}</span>
                    <p>{item.context}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {quoteCheck.work_categories.length > 0 && (
            <div className={styles.categories}>
              <strong>Postes détectés</strong>

              <div>
                {quoteCheck.work_categories.map((item) => (
                  <span key={item.code}>
                    {categoryLabels[item.code] || item.code}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.fieldGrid}>
            {quoteCheck.field_checks.map((field) => (
              <article
                key={field.code}
                className={
                  field.present
                    ? styles.fieldPresent
                    : styles.fieldMissing
                }
              >
                {field.present ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}

                <div>
                  <strong>{field.label}</strong>
                  <small>
                    {field.present
                      ? "Détecté dans le PDF"
                      : "Non détecté automatiquement"}
                  </small>
                </div>
              </article>
            ))}
          </div>

          {quoteCheck.red_flags.length > 0 && (
            <div className={styles.redFlags}>
              <strong>Signaux d’alerte</strong>

              {quoteCheck.red_flags.map((flag) => (
                <article key={`${flag.title}-${flag.detail}`}>
                  <SeverityBadge severity={flag.severity} />

                  <div>
                    <h3>{flag.title}</h3>
                    <p>{flag.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className={styles.decision}>
            <AlertTriangle size={17} />

            <div>
              <strong>
                Signature automatique non recommandée
              </strong>

              <p>{quoteCheck.decision.reason}</p>
            </div>
          </div>

          <div className={styles.limitations}>
            <strong>Limites</strong>

            <ul>
              {quoteCheck.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.saved}>
            <CheckCircle2 size={16} />
            Contrôle devis associé au projet permanent
          </div>
        </>
      )}
    </section>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const label =
    severity === "high"
      ? "Élevé"
      : severity === "medium"
        ? "Moyen"
        : "Faible";

  return (
    <em
      className={
        severity === "high"
          ? styles.high
          : severity === "medium"
            ? styles.medium
            : styles.low
      }
    >
      {label}
    </em>
  );
}

async function readPayload<T>(
  response: Response,
): Promise<T> {
  const responseText = await response.text();

  if (!responseText) {
    return {} as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(
      `Réponse serveur invalide (${response.status}).`,
    );
  }
}

function extractErrorMessage(
  payload: ApiError,
  status: number,
) {
  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (
    payload.detail &&
    typeof payload.detail === "object" &&
    payload.detail.message
  ) {
    return payload.detail.message;
  }

  return `La vérification a échoué (${status}).`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function statusLabel(status: string) {
  if (status === "structured") {
    return "Devis plutôt structuré";
  }

  if (status === "weak_quote") {
    return "Devis faible ou incomplet";
  }

  return "Revue nécessaire";
}
