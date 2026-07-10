"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleHelp,
  FileText,
  Flame,
  Gauge,
  Home,
  Info,
  Layers3,
  Ruler,
  ShieldCheck,
  ThermometerSun,
  Users,
  WalletCards,
  Wind,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import styles from "./PropertyQuestionnaire.module.css";

type AnswerValue = string | number;
type Answers = Record<string, AnswerValue>;

type QuestionOption = {
  value: string;
  label: string;
  description?: string;
};

type Question = {
  id: string;
  title: string;
  description: string;
  type: "choice" | "number";
  options?: QuestionOption[];
  unit?: string;
  minimum?: number;
  maximum?: number;
  placeholder?: string;
  allowUnknown?: boolean;
};

type StoredSnapshot = {
  address?: {
    value?: {
      label?: string;
      city?: string | null;
      postcode?: string | null;
    };
  };
  dpe?: {
    status?: string;
    verified?: boolean;
    value?: {
      energy_class?: string | null;
    } | null;
  };
};

type StoredDraft = {
  answers?: Answers;
};

type ProjectRecord = {
  id: string;
  status: string;
  answers: Answers;
  updated_at: string;
};

type ProjectApiError = {
  detail?: string;
  error?: string;
};

type SyncState =
  | "idle"
  | "saving"
  | "saved"
  | "error";

async function readProjectResponse<T>(
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

async function saveAnswersToProject(
  projectId: string,
  answers: Answers,
): Promise<ProjectRecord> {
  const response = await fetch(
    `/api/backend/projects/${encodeURIComponent(
      projectId,
    )}/answers`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers,
      }),
    },
  );

  const payload = await readProjectResponse<
    ProjectRecord | ProjectApiError
  >(response);

  if (!response.ok) {
    const errorPayload = payload as ProjectApiError;

    throw new Error(
      errorPayload.detail ||
        errorPayload.error ||
        "Les réponses n’ont pas pu être synchronisées.",
    );
  }

  return payload as ProjectRecord;
}

export function AdaptiveQuestionnaire() {
  const searchParams = useSearchParams();

  const [snapshot, setSnapshot] =
    useState<StoredSnapshot | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncState, setSyncState] =
    useState<SyncState>("idle");

  const fallbackAddress =
    searchParams.get("address") || "Logement sélectionné";

  useEffect(() => {
    try {
      const storedSnapshot = window.localStorage.getItem(
        "zami_property_snapshot",
      );

      const storedDraft = window.localStorage.getItem(
        "zami_questionnaire_draft",
      );

      if (storedSnapshot) {
        setSnapshot(
          JSON.parse(storedSnapshot) as StoredSnapshot,
        );
      }

      if (storedDraft) {
        const draft = JSON.parse(storedDraft) as StoredDraft;

        if (draft.answers) {
          setAnswers(draft.answers);
        }
      }
    } catch {
      // Invalid local draft is ignored safely.
    } finally {
      setLoaded(true);
    }
  }, []);

  const questions = useMemo(
    () => buildQuestions(snapshot, answers),
    [snapshot, answers],
  );

  useEffect(() => {
    if (
      questions.length > 0 &&
      currentIndex > questions.length - 1
    ) {
      setCurrentIndex(questions.length - 1);
    }
  }, [currentIndex, questions.length]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    window.localStorage.setItem(
      "zami_questionnaire_draft",
      JSON.stringify({
        answers,
        source_type: "homeowner",
        verification_status:
          "informations_proprietaire_ajoutees",
        updated_at: new Date().toISOString(),
      }),
    );

    const projectId = window.localStorage.getItem(
      "zami_project_id",
    );

    if (!projectId) {
      setSyncState("error");

      window.localStorage.setItem(
        "zami_project_sync_error",
        "Identifiant du projet absent.",
      );

      return;
    }

    setSyncState("saving");

    const timeoutId = window.setTimeout(() => {
      void saveAnswersToProject(projectId, answers)
        .then((project) => {
          window.localStorage.setItem(
            "zami_project_record",
            JSON.stringify(project),
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
          const message =
            syncError instanceof Error
              ? syncError.message
              : "Synchronisation impossible.";

          console.error(
            "Questionnaire project sync failed:",
            syncError,
          );

          window.localStorage.setItem(
            "zami_project_sync_status",
            "error",
          );

          window.localStorage.setItem(
            "zami_project_sync_error",
            message,
          );

          setSyncState("error");
        });
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [answers, loaded]);

  const addressLabel =
    snapshot?.address?.value?.label || fallbackAddress;

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const answeredQuestions = questions.filter((question) =>
    hasValidAnswer(answers[question.id]),
  ).length;

  const progress =
    questions.length > 0
      ? Math.round(
          ((currentIndex + 1) / questions.length) * 100,
        )
      : 0;

  function updateAnswer(
    questionId: string,
    value: AnswerValue,
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function goNext() {
    if (
      !currentQuestion ||
      !hasValidAnswer(answers[currentQuestion.id])
    ) {
      return;
    }

    if (currentIndex >= questions.length - 1) {
      setCompleted(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  function goBack() {
    if (currentIndex === 0) {
      return;
    }

    setCurrentIndex((index) => index - 1);
  }

  if (!loaded) {
    return (
      <QuestionnaireLoading />
    );
  }

  if (completed) {
    return (
      <QuestionnaireComplete
        address={addressLabel}
        answered={answeredQuestions}
        total={questions.length}
        answers={answers}
        questions={questions}
        onEdit={() => {
          setCompleted(false);
          setCurrentIndex(0);
        }}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <section className={styles.stateCard}>
        <CircleHelp size={36} />

        <h1>Impossible de préparer le questionnaire.</h1>

        <p>
          Recommencez l’analyse depuis l’adresse du logement.
        </p>

        <Link href="/">
          Retour à l’accueil
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/analyse" className={styles.backLink}>
          <ArrowLeft size={16} />
          Retour au premier aperçu
        </Link>

        <span>
          Étape 2 sur 4 · Informations propriétaire
        </span>
      </div>

      <div className={styles.layout}>
        <aside className={styles.contextPanel}>
          <div className={styles.contextIcon}>
            <Home size={24} />
          </div>

          <span className={styles.contextEyebrow}>
            Logement analysé
          </span>

          <h2>{addressLabel}</h2>

          <div className={styles.snapshotStatus}>
            <StatusLine
              icon={<ShieldCheck size={16} />}
              label="Adresse officielle"
              value="Vérifiée"
              complete
            />

            <StatusLine
              icon={<Gauge size={16} />}
              label="DPE"
              value={dpeStatus(snapshot)}
              complete={
                snapshot?.dpe?.status === "available" &&
                snapshot?.dpe?.verified === true
              }
            />

            <StatusLine
              icon={<Users size={16} />}
              label="Informations propriétaire"
              value={`${answeredQuestions}/${questions.length} complétées`}
              complete={
                answeredQuestions === questions.length
              }
            />
          </div>

          <div className={styles.contextNotice}>
            <Info size={16} />

            <p>
              Vos réponses sont déclaratives. Elles seront
              distinguées des données officielles dans le rapport.
            </p>
          </div>
        </aside>

        <main className={styles.questionCard}>
          <div className={styles.progressHeader}>
            <div>
              <span>
                Question {currentIndex + 1} sur{" "}
                {questions.length}
              </span>

              <strong>{progress}%</strong>
            </div>

            <div className={styles.progressTrack}>
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className={styles.questionContent}>
            <QuestionIcon id={currentQuestion.id} />

            <span className={styles.questionEyebrow}>
              Information nécessaire
            </span>

            <h1>{currentQuestion.title}</h1>
            <p>{currentQuestion.description}</p>

            {currentQuestion.type === "choice" && (
              <ChoiceQuestion
                question={currentQuestion}
                selected={String(currentAnswer ?? "")}
                onSelect={(value) =>
                  updateAnswer(currentQuestion.id, value)
                }
              />
            )}

            {currentQuestion.type === "number" && (
              <NumberQuestion
                question={currentQuestion}
                value={currentAnswer}
                onChange={(value) =>
                  updateAnswer(currentQuestion.id, value)
                }
              />
            )}
          </div>

          <footer className={styles.questionFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={goBack}
              disabled={currentIndex === 0}
            >
              <ArrowLeft size={16} />
              Précédent
            </button>

            <div className={styles.savedMessage}>
              <Check size={14} />

              {syncState === "saving"
                ? "Enregistrement en cours…"
                : syncState === "error"
                  ? "Enregistré localement · synchronisation en attente"
                  : "Réponses enregistrées automatiquement"}
            </div>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={goNext}
              disabled={!hasValidAnswer(currentAnswer)}
            >
              {currentIndex === questions.length - 1
                ? "Terminer"
                : "Continuer"}

              <ArrowRight size={16} />
            </button>
          </footer>
        </main>
      </div>
    </section>
  );
}

function buildQuestions(
  snapshot: StoredSnapshot | null,
  answers: Answers,
): Question[] {
  const questions: Question[] = [];

  const dpeVerified =
    snapshot?.dpe?.status === "available" &&
    snapshot?.dpe?.verified === true;

  if (!dpeVerified) {
    questions.push({
      id: "has_dpe_document",
      title: "Possédez-vous un DPE ou un audit énergétique ?",
      description:
        "Le document permettra de confirmer la performance énergétique exacte du logement.",
      type: "choice",
      options: [
        {
          value: "yes",
          label: "Oui, je possède un document",
          description:
            "Vous pourrez l’ajouter pendant la prochaine étape.",
        },
        {
          value: "no",
          label: "Non",
          description:
            "L’analyse continuera avec les informations disponibles.",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    });
  }

  questions.push({
    id: "property_type",
    title: "Quel est le type de logement ?",
    description:
      "Cette information détermine les questions concernant la toiture, les murs et les parties communes.",
    type: "choice",
    options: [
      {
        value: "house",
        label: "Maison individuelle",
        description:
          "Logement disposant généralement de sa propre toiture et de ses murs extérieurs.",
      },
      {
        value: "apartment",
        label: "Appartement",
        description:
          "Logement situé dans un immeuble ou une copropriété.",
      },
    ],
  });

  if (answers.property_type === "apartment") {
    questions.push({
      id: "apartment_floor",
      title: "À quel niveau se trouve l’appartement ?",
      description:
        "La position dans l’immeuble peut influencer les pertes par le sol ou la toiture.",
      type: "choice",
      options: [
        {
          value: "ground",
          label: "Rez-de-chaussée",
        },
        {
          value: "middle",
          label: "Étage intermédiaire",
        },
        {
          value: "top",
          label: "Dernier étage",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    });
  }

  questions.push(
    {
      id: "living_surface",
      title: "Quelle est la surface habitable ?",
      description:
        "Indiquez la surface du logement, hors garage, cave et parties communes.",
      type: "number",
      unit: "m²",
      minimum: 9,
      maximum: 1000,
      placeholder: "Exemple : 82",
      allowUnknown: true,
    },
    {
      id: "construction_period",
      title: "À quelle période le logement a-t-il été construit ?",
      description:
        "La période de construction aide à identifier les techniques et normes probablement utilisées.",
      type: "choice",
      options: [
        {
          value: "before_1948",
          label: "Avant 1948",
        },
        {
          value: "1948_1974",
          label: "1948 à 1974",
        },
        {
          value: "1975_1988",
          label: "1975 à 1988",
        },
        {
          value: "1989_2000",
          label: "1989 à 2000",
        },
        {
          value: "2001_2012",
          label: "2001 à 2012",
        },
        {
          value: "after_2012",
          label: "Après 2012",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    },
    {
      id: "heating_system",
      title: "Quel est le chauffage principal ?",
      description:
        "Choisissez le système qui chauffe la majorité du logement.",
      type: "choice",
      options: [
        {
          value: "gas",
          label: "Chaudière gaz",
        },
        {
          value: "electric",
          label: "Chauffage électrique",
        },
        {
          value: "heat_pump",
          label: "Pompe à chaleur",
        },
        {
          value: "oil",
          label: "Fioul",
        },
        {
          value: "wood",
          label: "Bois ou granulés",
        },
        {
          value: "district",
          label: "Chauffage collectif ou réseau",
        },
        {
          value: "other",
          label: "Autre système",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    },
  );

  if (answers.property_type === "house") {
    questions.push({
      id: "roof_insulation",
      title: "La toiture ou les combles sont-ils isolés ?",
      description:
        "Une toiture mal isolée peut représenter une part importante des pertes thermiques.",
      type: "choice",
      options: [
        {
          value: "good",
          label: "Oui, isolation récente ou en bon état",
        },
        {
          value: "old",
          label: "Oui, mais elle est ancienne",
        },
        {
          value: "none",
          label: "Non isolés",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    });
  }

  questions.push(
    {
      id: "wall_insulation",
      title: "Connaissez-vous l’état de l’isolation des murs ?",
      description:
        "Cette réponse restera déclarative jusqu’à la vérification par document ou inspection.",
      type: "choice",
      options: [
        {
          value: "good",
          label: "Isolation récente ou performante",
        },
        {
          value: "partial",
          label: "Isolation partielle ou ancienne",
        },
        {
          value: "none",
          label: "Murs non isolés",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    },
    {
      id: "windows",
      title: "Quel type de fenêtres équipe principalement le logement ?",
      description:
        "Choisissez la situation majoritaire lorsque plusieurs types de fenêtres sont présents.",
      type: "choice",
      options: [
        {
          value: "single",
          label: "Simple vitrage",
        },
        {
          value: "old_double",
          label: "Double vitrage ancien",
        },
        {
          value: "recent_double",
          label: "Double vitrage récent",
        },
        {
          value: "triple",
          label: "Triple vitrage",
        },
        {
          value: "mixed",
          label: "Plusieurs types",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    },
    {
      id: "ventilation",
      title: "Quel système de ventilation est présent ?",
      description:
        "Une ventilation adaptée est importante avant de renforcer l’isolation et l’étanchéité.",
      type: "choice",
      options: [
        {
          value: "natural",
          label: "Ventilation naturelle",
        },
        {
          value: "single_flow",
          label: "VMC simple flux",
        },
        {
          value: "double_flow",
          label: "VMC double flux",
        },
        {
          value: "none",
          label: "Aucun système identifié",
        },
        {
          value: "unknown",
          label: "Je ne sais pas",
        },
      ],
    },
    {
      id: "annual_energy_bill",
      title: "Quel est le montant annuel approximatif des factures d’énergie ?",
      description:
        "Additionnez approximativement chauffage, électricité et autres énergies utilisées dans le logement.",
      type: "number",
      unit: "€ / an",
      minimum: 0,
      maximum: 30000,
      placeholder: "Exemple : 2 100",
      allowUnknown: true,
    },
    {
      id: "primary_objective",
      title: "Quel est votre objectif principal ?",
      description:
        "ZAMI utilisera cet objectif pour prioriser les futurs scénarios de rénovation.",
      type: "choice",
      options: [
        {
          value: "comfort",
          label: "Améliorer le confort",
        },
        {
          value: "bills",
          label: "Réduire les factures",
        },
        {
          value: "dpe",
          label: "Améliorer le DPE",
        },
        {
          value: "sell",
          label: "Préparer une vente ou une location",
        },
        {
          value: "complete_project",
          label: "Préparer une rénovation globale",
        },
        {
          value: "quote_check",
          label: "Vérifier un projet ou un devis existant",
        },
      ],
    },
  );

  return questions;
}

function ChoiceQuestion({
  question,
  selected,
  onSelect,
}: {
  question: Question;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className={styles.optionGrid}>
      {question.options?.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.optionCard} ${
            selected === option.value
              ? styles.optionSelected
              : ""
          }`}
          onClick={() => onSelect(option.value)}
        >
          <span className={styles.optionIndicator}>
            {selected === option.value && (
              <Check size={15} />
            )}
          </span>

          <span>
            <strong>{option.label}</strong>

            {option.description && (
              <small>{option.description}</small>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

function NumberQuestion({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  const numericValue =
    typeof value === "number" ? String(value) : "";

  return (
    <div className={styles.numberArea}>
      <div className={styles.numberInput}>
        <input
          type="number"
          min={question.minimum}
          max={question.maximum}
          value={numericValue}
          placeholder={question.placeholder}
          onChange={(event) => {
            const nextValue = event.target.value;

            if (!nextValue) {
              onChange("");
              return;
            }

            onChange(Number(nextValue));
          }}
        />

        <span>{question.unit}</span>
      </div>

      {question.allowUnknown && (
        <button
          type="button"
          className={`${styles.unknownButton} ${
            value === "unknown"
              ? styles.unknownSelected
              : ""
          }`}
          onClick={() => onChange("unknown")}
        >
          Je ne connais pas cette information
        </button>
      )}
    </div>
  );
}

function QuestionnaireComplete({
  address,
  answered,
  total,
  answers,
  questions,
  onEdit,
}: {
  address: string;
  answered: number;
  total: number;
  answers: Answers;
  questions: Question[];
  onEdit: () => void;
}) {
  return (
    <section className={styles.completePage}>
      <div className={styles.completeCard}>
        <span className={styles.completeIcon}>
          <CheckCircle2 size={38} />
        </span>

        <span className={styles.completeEyebrow}>
          Informations propriétaire ajoutées
        </span>

        <h1>Le profil du logement est maintenant plus précis.</h1>

        <p>
          {answered} réponses sur {total} ont été enregistrées pour{" "}
          <strong>{address}</strong>.
        </p>

        <div className={styles.completeStats}>
          <div>
            <span>Statut</span>
            <strong>Informations ajoutées</strong>
          </div>

          <div>
            <span>Source</span>
            <strong>Déclaration propriétaire</strong>
          </div>

          <div>
            <span>Prochaine étape</span>
            <strong>Documents et photographies</strong>
          </div>
        </div>

        <div className={styles.answerPreview}>
          {questions
            .filter((question) =>
              hasValidAnswer(answers[question.id]),
            )
            .slice(0, 6)
            .map((question) => (
              <div key={question.id}>
                <span>{question.title}</span>

                <strong>
                  {answerLabel(
                    question,
                    answers[question.id],
                  )}
                </strong>
              </div>
            ))}
        </div>

        <div className={styles.completeActions}>
          <button type="button" onClick={onEdit}>
            Modifier mes réponses
          </button>

          <Link href="/analyse/documents">
            Ajouter mes documents
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className={styles.completeNotice}>
          <ShieldCheck size={16} />

          Ces réponses ne sont pas encore considérées comme
          vérifiées. Les documents et l’inspection pourront les
          confirmer.
        </div>
      </div>
    </section>
  );
}

function StatusLine({
  icon,
  label,
  value,
  complete = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  complete?: boolean;
}) {
  return (
    <div className={styles.statusLine}>
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
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}

function QuestionIcon({ id }: { id: string }) {
  const icons: Record<string, ReactNode> = {
    has_dpe_document: <FileText size={27} />,
    property_type: <Building2 size={27} />,
    apartment_floor: <Layers3 size={27} />,
    living_surface: <Ruler size={27} />,
    construction_period: <Home size={27} />,
    heating_system: <Flame size={27} />,
    roof_insulation: <ThermometerSun size={27} />,
    wall_insulation: <Home size={27} />,
    windows: <Home size={27} />,
    ventilation: <Wind size={27} />,
    annual_energy_bill: <WalletCards size={27} />,
    primary_objective: <Gauge size={27} />,
  };

  return (
    <span className={styles.questionIcon}>
      {icons[id] || <CircleHelp size={27} />}
    </span>
  );
}

function QuestionnaireLoading() {
  return (
    <section className={styles.stateCard}>
      <Gauge size={36} />
      <h1>Préparation des questions…</h1>

      <p>
        ZAMI sélectionne uniquement les informations nécessaires
        pour ce logement.
      </p>
    </section>
  );
}

function hasValidAnswer(value: AnswerValue | undefined) {
  return value !== undefined && value !== "";
}

function dpeStatus(snapshot: StoredSnapshot | null) {
  if (
    snapshot?.dpe?.status === "available" &&
    snapshot?.dpe?.verified
  ) {
    const grade = snapshot.dpe.value?.energy_class;

    return grade
      ? `Classe ${grade} vérifiée`
      : "DPE vérifié";
  }

  return "Document ou confirmation nécessaire";
}

function answerLabel(
  question: Question,
  value: AnswerValue,
) {
  if (value === "unknown") {
    return "Information inconnue";
  }

  if (question.type === "number") {
    return `${value} ${question.unit || ""}`.trim();
  }

  return (
    question.options?.find(
      (option) => option.value === value,
    )?.label || String(value)
  );
}
