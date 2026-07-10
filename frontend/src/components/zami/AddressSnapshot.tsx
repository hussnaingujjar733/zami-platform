"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleHelp,
  Database,
  FileQuestion,
  Gauge,
  Home,
  Leaf,
  LoaderCircle,
  MapPin,
  Search,
  ShieldCheck,
  ThermometerSun,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type DataStatus =
  | "available"
  | "not_found"
  | "unavailable"
  | "estimated"
  | "declared";

type Confidence =
  | "unknown"
  | "low"
  | "medium"
  | "high"
  | "very_high";

type DataPoint<T> = {
  value: T | null;
  unit: string | null;
  status: DataStatus;
  source_type: string;
  source_name: string;
  dataset: string | null;
  retrieved_at: string;
  confidence: Confidence;
  verified: boolean;
  message: string | null;
};

type AddressValue = {
  id: string | null;
  label: string;
  name: string | null;
  score: number;
  housenumber: string | null;
  street: string | null;
  postcode: string | null;
  citycode: string | null;
  city: string | null;
  district: string | null;
  context: string | null;
  type: string | null;
  longitude: number;
  latitude: number;
};

type DpeValue = {
  dpe_number: string | null;
  energy_class: string | null;
  ges_class: string | null;
  established_at: string | null;
  valid_until: string | null;
  building_type: string | null;
  living_surface_m2: number | null;
  energy_consumption_kwh_m2_year: number | null;
  ges_emissions_kgco2_m2_year: number | null;
  matched_address: string | null;
  address_match_score: number | null;
};

type SourceReference = {
  name: string;
  type: string;
  dataset: string | null;
  retrieved_at: string;
  official: boolean;
};

type PropertySnapshot = {
  address: DataPoint<AddressValue>;
  dpe: DataPoint<DpeValue>;
  data_completeness: number;
  analysis_confidence: Confidence;
  verification_status: string;
  missing_information: string[];
  recommended_next_questions: string[];
  sources: SourceReference[];
};

type ErrorPayload = {
  detail?: string;
  error?: string;
};

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

const PROJECT_ID_KEY = "zami_project_id";
const PROJECT_ADDRESS_KEY = "zami_project_address_label";
const PROJECT_RECORD_KEY = "zami_project_record";
const PROJECT_LOCK_KEY = "zami_project_creation_lock";

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

async function patchProjectSnapshot(
  projectId: string,
  snapshot: PropertySnapshot,
): Promise<ProjectRecord | null> {
  const response = await fetch(
    `/api/backend/projects/${encodeURIComponent(
      projectId,
    )}/snapshot`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snapshot,
      }),
    },
  );

  if (response.status === 404) {
    return null;
  }

  const payload = await readJsonResponse<
    ProjectRecord | ErrorPayload
  >(response);

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload;

    throw new Error(
      errorPayload.detail ||
        errorPayload.error ||
        "Le projet n’a pas pu être actualisé.",
    );
  }

  return payload as ProjectRecord;
}

async function createProjectFromSnapshot(
  snapshot: PropertySnapshot,
): Promise<ProjectRecord> {
  const addressValue = snapshot.address.value;

  if (!addressValue?.label) {
    throw new Error(
      "L’adresse officielle est absente du dossier.",
    );
  }

  const response = await fetch("/api/backend/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_label: addressValue.label,
      address: addressValue,
      snapshot,
    }),
  });

  const payload = await readJsonResponse<
    ProjectRecord | ErrorPayload
  >(response);

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload;

    throw new Error(
      errorPayload.detail ||
        errorPayload.error ||
        "Le projet permanent n’a pas pu être créé.",
    );
  }

  return payload as ProjectRecord;
}

function saveProjectLocally(project: ProjectRecord) {
  window.localStorage.setItem(
    PROJECT_ID_KEY,
    project.id,
  );

  window.localStorage.setItem(
    PROJECT_ADDRESS_KEY,
    project.address_label || "",
  );

  window.localStorage.setItem(
    PROJECT_RECORD_KEY,
    JSON.stringify(project),
  );

  window.localStorage.setItem(
    "zami_project_sync_status",
    "saved",
  );

  window.localStorage.removeItem(
    "zami_project_sync_error",
  );
}

function clearPreviousProjectState() {
  window.localStorage.removeItem(PROJECT_ID_KEY);
  window.localStorage.removeItem(PROJECT_ADDRESS_KEY);
  window.localStorage.removeItem(PROJECT_RECORD_KEY);

  window.localStorage.removeItem(
    "zami_questionnaire_draft",
  );

  window.localStorage.removeItem(
    "zami_uploaded_evidence",
  );

  window.localStorage.removeItem(
    "zami_evidence_session_id",
  );
}

async function waitForProjectId(
  addressLabel: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const projectId = window.localStorage.getItem(
      PROJECT_ID_KEY,
    );

    const projectAddress = window.localStorage.getItem(
      PROJECT_ADDRESS_KEY,
    );

    if (
      projectId &&
      projectAddress === addressLabel
    ) {
      return projectId;
    }

    await new Promise((resolve) =>
      window.setTimeout(resolve, 120),
    );
  }

  return null;
}

async function persistSnapshotProject(
  snapshot: PropertySnapshot,
): Promise<ProjectRecord> {
  const addressLabel = snapshot.address.value?.label;

  if (!addressLabel) {
    throw new Error(
      "Impossible de créer le projet sans adresse officielle.",
    );
  }

  const existingProjectId =
    window.localStorage.getItem(PROJECT_ID_KEY);

  const existingProjectAddress =
    window.localStorage.getItem(PROJECT_ADDRESS_KEY);

  if (
    existingProjectId &&
    existingProjectAddress === addressLabel
  ) {
    const updatedProject = await patchProjectSnapshot(
      existingProjectId,
      snapshot,
    );

    if (updatedProject) {
      saveProjectLocally(updatedProject);
      return updatedProject;
    }

    clearPreviousProjectState();
  } else if (
    existingProjectId ||
    existingProjectAddress
  ) {
    clearPreviousProjectState();
  }

  const lockValue =
    window.localStorage.getItem(PROJECT_LOCK_KEY);

  if (lockValue) {
    try {
      const lock = JSON.parse(lockValue) as {
        addressLabel?: string;
        createdAt?: number;
      };

      const lockIsRecent =
        typeof lock.createdAt === "number" &&
        Date.now() - lock.createdAt < 15000;

      if (
        lock.addressLabel === addressLabel &&
        lockIsRecent
      ) {
        const projectId = await waitForProjectId(
          addressLabel,
        );

        if (projectId) {
          const updatedProject =
            await patchProjectSnapshot(
              projectId,
              snapshot,
            );

          if (updatedProject) {
            saveProjectLocally(updatedProject);
            return updatedProject;
          }
        }
      }
    } catch {
      window.localStorage.removeItem(PROJECT_LOCK_KEY);
    }
  }

  const lockToken =
    window.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.random()}`;

  window.localStorage.setItem(
    PROJECT_LOCK_KEY,
    JSON.stringify({
      token: lockToken,
      addressLabel,
      createdAt: Date.now(),
    }),
  );

  try {
    const project = await createProjectFromSnapshot(
      snapshot,
    );

    saveProjectLocally(project);
    return project;
  } finally {
    const currentLock =
      window.localStorage.getItem(PROJECT_LOCK_KEY);

    if (currentLock) {
      try {
        const parsedLock = JSON.parse(currentLock) as {
          token?: string;
        };

        if (parsedLock.token === lockToken) {
          window.localStorage.removeItem(
            PROJECT_LOCK_KEY,
          );
        }
      } catch {
        window.localStorage.removeItem(
          PROJECT_LOCK_KEY,
        );
      }
    }
  }
}

export function AddressSnapshot() {
  const searchParams = useSearchParams();
  const initialAddress = searchParams.get("address")?.trim() ?? "";

  const [query, setQuery] = useState(initialAddress);
  const [snapshot, setSnapshot] = useState<PropertySnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(initialAddress));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialAddress) {
      setLoading(false);
      return;
    }

    void loadSnapshot(initialAddress);
  }, [initialAddress]);

  async function loadSnapshot(address: string) {
    const cleanAddress = address.trim();

    if (cleanAddress.length < 6) {
      setError(
        "Veuillez saisir le numéro, la rue, le code postal et la commune.",
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSnapshot(null);

    try {
      const response = await fetch("/api/backend/property/snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          address: cleanAddress,
        }),
      });

      const payload = (await response.json()) as
        | PropertySnapshot
        | ErrorPayload;

      if (!response.ok) {
        const errorPayload = payload as ErrorPayload;

        throw new Error(
          errorPayload.detail ||
            errorPayload.error ||
            "L’analyse du logement est temporairement indisponible.",
        );
      }

      const propertySnapshot = payload as PropertySnapshot;

      if (!propertySnapshot.address?.value) {
        throw new Error(
          "L’adresse n’a pas pu être confirmée par la source officielle.",
        );
      }

      setSnapshot(propertySnapshot);

      window.localStorage.setItem(
        "zami_property_snapshot",
        JSON.stringify({
          ...propertySnapshot,
          saved_at: new Date().toISOString(),
        }),
      );

      try {
        await persistSnapshotProject(propertySnapshot);
      } catch (projectError) {
        console.error(
          "ZAMI project synchronization failed:",
          projectError,
        );

        window.localStorage.setItem(
          "zami_project_sync_status",
          "error",
        );

        window.localStorage.setItem(
          "zami_project_sync_error",
          projectError instanceof Error
            ? projectError.message
            : "Synchronisation du projet impossible.",
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Une erreur est survenue pendant l’analyse.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadSnapshot(query);
  }

  if (loading) {
    return <SnapshotLoading />;
  }

  if (!snapshot?.address.value) {
    return (
      <SnapshotError
        query={query}
        error={error}
        onQueryChange={(value) => {
          setQuery(value);
          setError("");
        }}
        onSubmit={submit}
      />
    );
  }

  const address = snapshot.address.value;
  const dpe = snapshot.dpe;
  const dpeValue = dpe.value;

  const context = parseAddressContext(address.context);

  const addressMatch = Math.max(
    0,
    Math.min(100, Math.round(address.score * 100)),
  );

  const questionsUrl = buildQuestionsUrl(address);

  return (
    <section className="zmvp-snapshot-page">
      <div className="zmvp-snapshot-breadcrumb">
        <Link href="/">
          <ArrowLeft size={15} />
          Modifier l’adresse
        </Link>

        <span>Étape 1 sur 4 · Identification</span>
      </div>

      <header className="zmvp-snapshot-header">
        <div>
          <div className="zmvp-verified-badge">
            <ShieldCheck size={15} />
            Adresse vérifiée par une source officielle
          </div>

          <span className="zmvp-snapshot-kicker">
            Votre logement a été identifié
          </span>

          <h1>{address.label}</h1>

          <p>
            ZAMI a vérifié l’adresse et recherché les informations
            énergétiques officiellement disponibles. Aucun résultat manquant
            n’est remplacé par une valeur inventée.
          </p>
        </div>

        <div className="zmvp-match-card">
          <span>Correspondance de l’adresse</span>
          <strong>{addressMatch}%</strong>

          <div>
            <i style={{ width: `${addressMatch}%` }} />
          </div>

          <p>{addressMatchLabel(address.score)}</p>
        </div>
      </header>

      <div className="zmvp-snapshot-grid">
        <div className="zmvp-snapshot-column">
          <article className="zmvp-snapshot-main-card">
            <CardHeading
              icon={Database}
              eyebrow="Source officielle"
              title="Adresse et localisation"
            />

            <div className="zmvp-property-facts">
              <PropertyFact
                label="Adresse normalisée"
                value={address.label}
              />

              <PropertyFact
                label="Commune"
                value={address.city || "Non disponible"}
              />

              <PropertyFact
                label="Code postal"
                value={address.postcode || "Non disponible"}
              />

              <PropertyFact
                label="Code INSEE"
                value={address.citycode || "Non disponible"}
              />

              <PropertyFact
                label="Département"
                value={context.department}
              />

              <PropertyFact
                label="Région"
                value={context.region}
              />

              <PropertyFact
                label="Latitude"
                value={address.latitude.toFixed(6)}
              />

              <PropertyFact
                label="Longitude"
                value={address.longitude.toFixed(6)}
              />
            </div>

            <SourceNote
              source="IGN Géoplateforme · Base Adresse Nationale"
              date={snapshot.address.retrieved_at}
            >
              Cette source vérifie l’adresse et sa localisation. Elle ne
              décrit pas encore l’état technique du bâtiment.
            </SourceNote>
          </article>

          <article className="zmvp-snapshot-main-card">
            <CardHeading
              icon={ThermometerSun}
              eyebrow="Performance énergétique"
              title="DPE officiellement disponible"
            />

            {dpe.status === "available" &&
            dpe.verified &&
            dpeValue ? (
              <VerifiedDpe value={dpeValue} />
            ) : (
              <UnavailableDpe dataPoint={dpe} />
            )}

            <SourceNote
              source="ADEME · DPE logements existants"
              date={dpe.retrieved_at}
            >
              ZAMI associe un DPE uniquement lorsque le numéro, la rue, le
              code postal et la commune correspondent suffisamment
              précisément.
            </SourceNote>
          </article>
        </div>

        <aside className="zmvp-data-readiness">
          <CardHeading
            icon={Gauge}
            eyebrow="État actuel"
            title="Qualité du dossier"
          />

          <div className="zmvp-completeness-card">
            <div>
              <span>Complétude des données</span>
              <strong>{snapshot.data_completeness}%</strong>
            </div>

            <div className="zmvp-completeness-track">
              <i
                style={{
                  width: `${snapshot.data_completeness}%`,
                }}
              />
            </div>

            <p>
              Ce score mesure les informations disponibles. Il ne représente
              pas encore la précision finale du projet.
            </p>
          </div>

          <DataStatusRow
            icon={<MapPin size={17} />}
            title="Adresse officielle"
            status="Vérifiée"
            complete={snapshot.address.verified}
          />

          <DataStatusRow
            icon={<FileQuestion size={17} />}
            title="DPE du logement"
            status={
              dpe.status === "available" && dpe.verified
                ? "Identifié et vérifié"
                : "Non identifié avec certitude"
            }
            complete={dpe.status === "available" && dpe.verified}
          />

          <DataStatusRow
            icon={<Building2 size={17} />}
            title="Type et surface"
            status="À confirmer avec le propriétaire"
          />

          <DataStatusRow
            icon={<Home size={17} />}
            title="Isolation et équipements"
            status="Informations manquantes"
          />

          <div className="zmvp-confidence-summary">
            <span>Confiance de l’analyse</span>

            <strong
              className={`confidence-${snapshot.analysis_confidence}`}
            >
              {confidenceLabel(snapshot.analysis_confidence)}
            </strong>

            <p>
              Statut :{" "}
              {verificationStatusLabel(
                snapshot.verification_status,
              )}
            </p>
          </div>
        </aside>
      </div>

      <section className="zmvp-information-panel">
        <div>
          <span className="zmvp-panel-number">
            {snapshot.missing_information.length}
          </span>

          <div>
            <span className="zmvp-panel-eyebrow">
              Informations encore nécessaires
            </span>

            <h2>
              Quelques réponses permettront d’éviter les suppositions.
            </h2>
          </div>
        </div>

        <div className="zmvp-missing-grid">
          {snapshot.missing_information.map((information) => (
            <div key={information}>
              <CircleHelp size={16} />
              <span>{information}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="zmvp-next-questions">
        <div className="zmvp-next-questions-copy">
          <span>Prochaine étape</span>

          <h2>Questions recommandées pour votre logement</h2>

          <p>
            Le questionnaire utilisera uniquement les questions nécessaires à
            partir des données déjà disponibles.
          </p>
        </div>

        <ol>
          {snapshot.recommended_next_questions
            .slice(0, 6)
            .map((question, index) => (
              <li key={question}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{question}</p>
              </li>
            ))}
        </ol>

        <Link href={questionsUrl}>
          Compléter les informations essentielles
          <ArrowRight size={17} />
        </Link>
      </section>

      <section className="zmvp-sources-panel">
        <div>
          <Leaf size={18} />
          <strong>Sources consultées</strong>
        </div>

        {snapshot.sources.map((source) => (
          <p key={`${source.name}-${source.dataset}`}>
            <ShieldCheck size={14} />

            <span>
              <strong>{source.name}</strong>
              <small>
                {source.dataset || "Source officielle"} · Consultée le{" "}
                {formatDate(source.retrieved_at)}
              </small>
            </span>
          </p>
        ))}
      </section>
    </section>
  );
}

function SnapshotLoading() {
  return (
    <section className="zmvp-snapshot-state">
      <LoaderCircle className="zmvp-spin" size={38} />

      <span>Sources françaises en cours de consultation</span>
      <h1>Identification du logement…</h1>

      <p>
        ZAMI vérifie l’adresse puis recherche les informations énergétiques
        disponibles sans utiliser de valeurs par défaut.
      </p>
    </section>
  );
}

function SnapshotError({
  query,
  error,
  onQueryChange,
  onSubmit,
}: {
  query: string;
  error: string;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="zmvp-snapshot-state">
      <AlertTriangle size={38} />

      <span>Adresse à confirmer</span>
      <h1>L’analyse ne peut pas encore commencer.</h1>

      <p>
        Vérifiez le numéro, la rue, le code postal et la commune, puis
        relancez la recherche.
      </p>

      <form onSubmit={onSubmit} className="zmvp-retry-form">
        <MapPin size={19} />

        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="12 rue Victor-Hugo, 75015 Paris"
        />

        <button type="submit">
          Vérifier
          <Search size={16} />
        </button>
      </form>

      {error && <p className="zmvp-snapshot-error">{error}</p>}

      <Link href="/">
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>
    </section>
  );
}

function CardHeading({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="zmvp-card-heading">
      <div>
        <Icon size={20} />
      </div>

      <span>
        <small>{eyebrow}</small>
        <strong>{title}</strong>
      </span>
    </div>
  );
}

function PropertyFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SourceNote({
  source,
  date,
  children,
}: {
  source: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <div className="zmvp-source-note">
      <ShieldCheck size={17} />

      <div>
        <strong>{source}</strong>
        <p>{children}</p>
        <small>Consultée le {formatDate(date)}</small>
      </div>
    </div>
  );
}

function VerifiedDpe({
  value,
}: {
  value: DpeValue;
}) {
  const energyClass = normalizeGrade(value.energy_class);
  const gesClass = normalizeGrade(value.ges_class);

  return (
    <div className="zmvp-dpe-result">
      <div className="zmvp-dpe-grades">
        <DpeGrade
          label="Classe énergie"
          grade={energyClass}
        />

        <DpeGrade
          label="Classe climat"
          grade={gesClass}
        />
      </div>

      <div className="zmvp-dpe-facts">
        <PropertyFact
          label="Type de bâtiment"
          value={value.building_type || "Non disponible"}
        />

        <PropertyFact
          label="Surface indiquée"
          value={
            value.living_surface_m2
              ? `${value.living_surface_m2} m²`
              : "Non disponible"
          }
        />

        <PropertyFact
          label="Consommation"
          value={
            value.energy_consumption_kwh_m2_year
              ? `${value.energy_consumption_kwh_m2_year} kWhEP/m²/an`
              : "Non disponible"
          }
        />

        <PropertyFact
          label="Émissions"
          value={
            value.ges_emissions_kgco2_m2_year
              ? `${value.ges_emissions_kgco2_m2_year} kgCO₂/m²/an`
              : "Non disponible"
          }
        />

        <PropertyFact
          label="Date du DPE"
          value={
            value.established_at
              ? formatDate(value.established_at)
              : "Non disponible"
          }
        />

        <PropertyFact
          label="Validité"
          value={
            value.valid_until
              ? `Jusqu’au ${formatDate(value.valid_until)}`
              : "Non disponible"
          }
        />
      </div>
    </div>
  );
}

function DpeGrade({
  label,
  grade,
}: {
  label: string;
  grade: string;
}) {
  return (
    <div className={`zmvp-dpe-grade grade-${grade.toLowerCase()}`}>
      <span>{label}</span>
      <strong>{grade}</strong>
    </div>
  );
}

function UnavailableDpe({
  dataPoint,
}: {
  dataPoint: DataPoint<DpeValue>;
}) {
  return (
    <div className="zmvp-dpe-unavailable">
      <FileQuestion size={28} />

      <div>
        <span>DPE officiel non identifié</span>

        <h3>
          Aucun diagnostic n’a été associé avec suffisamment de certitude.
        </h3>

        <p>
          {dataPoint.message ||
            "Vous pourrez ajouter votre document DPE pendant les prochaines étapes."}
        </p>
      </div>
    </div>
  );
}

function DataStatusRow({
  icon,
  title,
  status,
  complete = false,
}: {
  icon: ReactNode;
  title: string;
  status: string;
  complete?: boolean;
}) {
  return (
    <div
      className={`zmvp-data-status ${complete ? "is-complete" : ""}`}
    >
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        <small>{status}</small>
      </div>

      <i>{complete ? <Check size={12} /> : "—"}</i>
    </div>
  );
}

function parseAddressContext(context: string | null) {
  const parts =
    context
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  const departmentCode = parts[0] || "";
  const departmentName = parts[1] || "";

  return {
    department:
      departmentCode || departmentName
        ? `${departmentCode}${
            departmentCode && departmentName ? " · " : ""
          }${departmentName}`
        : "Non disponible",
    region:
      parts.length > 2
        ? parts.slice(2).join(", ")
        : "Non disponible",
  };
}

function normalizeGrade(value: string | null) {
  const grade = value?.trim().toUpperCase();

  return grade && /^[A-G]$/.test(grade) ? grade : "—";
}

function addressMatchLabel(score: number) {
  if (score >= 0.9) return "Très bonne correspondance";
  if (score >= 0.75) return "Bonne correspondance";
  if (score >= 0.6) return "Correspondance à confirmer";
  return "Correspondance faible";
}

function confidenceLabel(confidence: Confidence) {
  const labels: Record<Confidence, string> = {
    unknown: "Non déterminée",
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    very_high: "Très élevée",
  };

  return labels[confidence];
}

function verificationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    identification_initiale: "Identification initiale",
    informations_proprietaire: "Informations propriétaire ajoutées",
    documents_analyses: "Documents analysés",
    photos_analysees: "Photos analysées",
    verifie_sur_site: "Projet vérifié sur site",
  };

  return labels[status] || status.replaceAll("_", " ");
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "date non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildQuestionsUrl(address: AddressValue) {
  const parameters = new URLSearchParams({
    address: address.label,
    city: address.city || "",
    postcode: address.postcode || "",
    citycode: address.citycode || "",
  });

  return `/analyse/questions?${parameters.toString()}`;
}
