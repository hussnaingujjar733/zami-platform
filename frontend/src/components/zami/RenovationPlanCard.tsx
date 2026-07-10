"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./RenovationPlanCard.module.css";

type PlanAction = {
  code: string;
  title: string;
  priority: "high" | "medium" | "low" | string;
  reason: string;
  verification: string;
  evidence_needed: string[];
  contractor_questions: string[];
  pricing_status: string;
  savings_status: string;
  subsidy_status: string;
};

type RenovationPlan = {
  status: string;
  generated_at: string;
  project_id: string;
  plan_type: string;
  summary: {
    actions_count: number;
    high_priority_count: number;
    missing_information_count: number;
    evidence_files: number;
  };
  actions: PlanAction[];
  missing_information: string[];
  risk_notes: string[];
  limitations: string[];
};

type PlanResponse = {
  success?: boolean;
  status?: string;
  plan?: RenovationPlan;
};

type ApiError = {
  detail?: string;
  error?: string;
};

export function RenovationPlanCard({
  projectId,
}: {
  projectId: string;
}) {
  const [plan, setPlan] = useState<RenovationPlan | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadExistingPlan() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/backend/projects/${encodeURIComponent(
            projectId,
          )}/renovation-plan`,
          {
            cache: "no-store",
          },
        );

        if (response.status === 404) {
          return;
        }

        const payload = await readPayload<
          PlanResponse | ApiError
        >(response);

        if (!response.ok) {
          const errorPayload = payload as ApiError;

          throw new Error(
            errorPayload.detail ||
              errorPayload.error ||
              "Le plan n’a pas pu être chargé.",
          );
        }

        if (!cancelled) {
          setPlan((payload as PlanResponse).plan || null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Le plan n’a pas pu être chargé.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadExistingPlan();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function runPlan() {
    setRunning(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/renovation-plan/run`,
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const payload = await readPayload<
        PlanResponse | ApiError
      >(response);

      if (!response.ok) {
        const errorPayload = payload as ApiError;

        throw new Error(
          errorPayload.detail ||
            errorPayload.error ||
            "Le plan n’a pas pu être généré.",
        );
      }

      const generatedPlan = (payload as PlanResponse).plan;

      if (!generatedPlan) {
        throw new Error(
          "Le serveur n’a retourné aucun plan.",
        );
      }

      setPlan(generatedPlan);

      window.localStorage.setItem(
        "zami_renovation_plan",
        JSON.stringify(generatedPlan),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Le plan n’a pas pu être généré.",
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
            <strong>Chargement du plan…</strong>
            <small>
              Recherche du plan d’action enregistré.
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
          <ClipboardList size={22} />
        </span>

        <div>
          <small>Plan d’action préliminaire</small>
          <h2>Priorités de rénovation</h2>

          <p>
            Ce plan indique ce qu’il faut vérifier avant devis. Il
            ne garantit aucun coût, gain énergétique ou montant
            d’aide.
          </p>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void runPlan()}
        >
          {running ? (
            <LoaderCircle
              size={16}
              className={styles.spinner}
            />
          ) : (
            <RefreshCw size={16} />
          )}

          {plan ? "Regénérer le plan" : "Générer le plan"}
        </button>
      </header>

      {error && (
        <div className={styles.error}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!plan && !error && (
        <div className={styles.empty}>
          <ClipboardList size={25} />

          <div>
            <strong>Aucun plan généré</strong>
            <p>
              Lancez le plan pour obtenir les priorités de
              vérification et les questions à poser aux artisans.
            </p>
          </div>
        </div>
      )}

      {plan && (
        <>
          <div className={styles.summaryGrid}>
            <SummaryFact
              label="Actions"
              value={plan.summary.actions_count}
            />

            <SummaryFact
              label="Priorité haute"
              value={plan.summary.high_priority_count}
            />

            <SummaryFact
              label="Infos manquantes"
              value={
                plan.summary.missing_information_count
              }
            />

            <SummaryFact
              label="Preuves"
              value={plan.summary.evidence_files}
            />
          </div>

          {plan.missing_information.length > 0 && (
            <div className={styles.missingBox}>
              <strong>Informations encore nécessaires</strong>

              <div>
                {plan.missing_information.map((item) => (
                  <span key={item}>
                    <AlertTriangle size={13} />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {plan.risk_notes.length > 0 && (
            <div className={styles.riskBox}>
              <ShieldCheck size={17} />

              <div>
                <strong>Points de vigilance</strong>

                {plan.risk_notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          )}

          <div className={styles.actionList}>
            {plan.actions.map((action, index) => (
              <article key={action.code}>
                <div className={styles.actionTop}>
                  <span>#{index + 1}</span>

                  <PriorityBadge
                    priority={action.priority}
                  />
                </div>

                <h3>{action.title}</h3>

                <p>{action.reason}</p>

                <div className={styles.verification}>
                  <strong>À vérifier</strong>
                  <small>{action.verification}</small>
                </div>

                <div className={styles.columns}>
                  <div>
                    <strong>Preuves utiles</strong>

                    <ul>
                      {action.evidence_needed.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong>Questions artisan</strong>

                    <ul>
                      {action.contractor_questions.map(
                        (item) => (
                          <li key={item}>{item}</li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>

                <footer>
                  <span>Coût non chiffré</span>
                  <span>Aide non vérifiée</span>
                  <span>Gain non estimé</span>
                </footer>
              </article>
            ))}
          </div>

          <div className={styles.limitations}>
            <strong>Limites</strong>

            <ul>
              {plan.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.saved}>
            <CheckCircle2 size={16} />
            Plan associé au projet permanent
          </div>
        </>
      )}
    </section>
  );
}

function SummaryFact({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  const label =
    priority === "high"
      ? "Priorité haute"
      : priority === "medium"
        ? "Priorité moyenne"
        : "Priorité basse";

  return (
    <em
      className={
        priority === "high"
          ? styles.high
          : priority === "medium"
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
