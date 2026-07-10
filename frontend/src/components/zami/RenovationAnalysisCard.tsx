"use client";

import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./RenovationAnalysisCard.module.css";

type AnalysisResult = {
  status: string;
  generated_at: string;
  estimate: {
    central_cost_eur: number;
    currency: string;
    estimate_type: string;
    display_label: string;
    is_quote: boolean;
    is_confidence_interval: boolean;
  };
  confidence: string;
  inputs: {
    surface_m2: number;
    surface_source: string;
    verified_dpe_class: string;
    postcode: string;
    region_code: number;
  };
  model: {
    name: string;
    version: string;
    production_status: string;
    validation_metrics_available: boolean;
  };
  warnings: string[];
  next_required_step: string;
};

type AnalysisResponse = {
  success?: boolean;
  status?: string;
  analysis?: AnalysisResult;
};

type ErrorPayload = {
  detail?:
    | string
    | {
        code?: string;
        message?: string;
        missing?: string[];
      };
};

const missingLabels: Record<string, string> = {
  living_surface: "Surface habitable",
  verified_dpe: "DPE officiel vérifié",
  postcode: "Code postal",
  supported_surface: "Surface comprise entre 20 et 300 m²",
  supported_dpe_class: "Classe DPE D, E, F ou G",
};

export function RenovationAnalysisCard({
  projectId,
}: {
  projectId: string;
}) {
  const [analysis, setAnalysis] =
    useState<AnalysisResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadExistingAnalysis() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/backend/projects/${encodeURIComponent(
            projectId,
          )}/analysis`,
          {
            cache: "no-store",
          },
        );

        if (response.status === 404) {
          return;
        }

        const payload =
          await readPayload<AnalysisResponse | ErrorPayload>(
            response,
          );

        if (!response.ok) {
          throw new Error(
            extractErrorMessage(
              payload as ErrorPayload,
              response.status,
            ),
          );
        }

        if (
          !cancelled &&
          (payload as AnalysisResponse).analysis
        ) {
          setAnalysis(
            (payload as AnalysisResponse)
              .analysis as AnalysisResult,
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "L’analyse enregistrée n’a pas pu être chargée.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadExistingAnalysis();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function runAnalysis() {
    setRunning(true);
    setError("");
    setMissing([]);

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/analysis/run`,
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const payload =
        await readPayload<AnalysisResponse | ErrorPayload>(
          response,
        );

      if (!response.ok) {
        const errorPayload = payload as ErrorPayload;

        if (
          typeof errorPayload.detail === "object" &&
          Array.isArray(errorPayload.detail.missing)
        ) {
          setMissing(errorPayload.detail.missing);
        }

        throw new Error(
          extractErrorMessage(
            errorPayload,
            response.status,
          ),
        );
      }

      const result = (payload as AnalysisResponse).analysis;

      if (!result) {
        throw new Error(
          "Le serveur n’a retourné aucun résultat d’analyse.",
        );
      }

      setAnalysis(result);

      window.localStorage.setItem(
        "zami_analysis_result",
        JSON.stringify(result),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "L’estimation n’a pas pu être générée.",
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
            size={25}
            className={styles.spinner}
          />

          <div>
            <strong>Chargement de l’analyse…</strong>
            <small>
              Recherche d’une estimation enregistrée.
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
          <Calculator size={22} />
        </span>

        <div>
          <small>Modèle expérimental ZAMI</small>
          <h2>Estimation indicative des travaux</h2>

          <p>
            Cette analyse utilise le DPE vérifié, la surface et le
            contexte géographique. Elle ne constitue pas un devis.
          </p>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void runAnalysis()}
        >
          {running ? (
            <LoaderCircle
              size={16}
              className={styles.spinner}
            />
          ) : (
            <RefreshCw size={16} />
          )}

          {analysis ? "Recalculer" : "Lancer l’estimation"}
        </button>
      </header>

      {error && (
        <div className={styles.error}>
          <ShieldAlert size={18} />

          <div>
            <strong>Estimation indisponible</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className={styles.missing}>
          <strong>Informations nécessaires</strong>

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

      {!analysis && !error && (
        <div className={styles.empty}>
          <Calculator size={27} />

          <div>
            <strong>
              Aucune estimation n’a encore été générée
            </strong>

            <p>
              Le modèle fonctionnera uniquement si les données
              obligatoires sont disponibles et vérifiées.
            </p>
          </div>
        </div>
      )}

      {analysis && (
        <>
          <div className={styles.result}>
            <div className={styles.price}>
              <small>
                {analysis.estimate.display_label}
              </small>

              <strong>
                {formatCurrency(
                  analysis.estimate.central_cost_eur,
                )}
              </strong>

              <span>
                Valeur centrale du modèle · pas un devis
              </span>
            </div>

            <div className={styles.confidence}>
              <small>Niveau de confiance</small>

              <strong>
                {confidenceLabel(analysis.confidence)}
              </strong>

              <p>
                Aucune marge statistique validée n’est actuellement
                disponible.
              </p>
            </div>
          </div>

          <div className={styles.inputs}>
            <InputFact
              label="Surface utilisée"
              value={`${analysis.inputs.surface_m2} m²`}
              note={
                analysis.inputs.surface_source ===
                "verified_dpe"
                  ? "Source : DPE vérifié"
                  : "Source : déclaration propriétaire"
              }
            />

            <InputFact
              label="Classe DPE"
              value={analysis.inputs.verified_dpe_class}
              note="Donnée officielle vérifiée"
            />

            <InputFact
              label="Code postal"
              value={analysis.inputs.postcode}
              note={`Zone modèle ${analysis.inputs.region_code}`}
            />

            <InputFact
              label="Version du modèle"
              value={analysis.model.version}
              note="Statut expérimental"
            />
          </div>

          <div className={styles.warnings}>
            <div className={styles.warningTitle}>
              <AlertTriangle size={17} />
              <strong>Limites de cette estimation</strong>
            </div>

            <ul>
              {analysis.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>

          <footer className={styles.footer}>
            <CheckCircle2 size={17} />

            <p>{analysis.next_required_step}</p>

            <span>
              Généré le {formatDate(analysis.generated_at)}
            </span>
          </footer>
        </>
      )}
    </section>
  );
}

function InputFact({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
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
  payload: ErrorPayload,
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

  return `L’analyse a échoué (${status}).`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceLabel(value: string) {
  if (value === "low") {
    return "Faible";
  }

  if (value === "very_low") {
    return "Très faible";
  }

  if (value === "medium") {
    return "Moyen";
  }

  if (value === "high") {
    return "Élevé";
  }

  return value;
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
