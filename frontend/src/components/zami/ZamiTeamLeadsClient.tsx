"use client";

import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Home,
  Mail,
  Phone,
  RefreshCw,
  Save,
  User,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { TeamProjectProgressBox } from "./TeamProjectProgressBox";
import { TeamProjectPhotosBox } from "./TeamProjectPhotosBox";
import { TeamProjectOfferBox } from "./TeamProjectOfferBox";

import styles from "./ZamiTeamLeadsClient.module.css";
import { ManagedProjectBriefBox } from "./ManagedProjectBriefBox";

type ManagedProject = {
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
  has_quote: boolean;
  has_artisan: boolean;
  budget_range?: string;
  description?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  preferred_contact?: string;
  admin_notification_status?: string;
  n8n_status?: string;
  internal_note?: string;
  next_action?: string;
  client_public_note?: string;
  client_requested_action?: string;
  created_at: string;
};

type ManagedDocument = {
  id: string;
  managed_project_id: string;
  document_type: string;
  original_filename: string;
  file_kind: string;
  size_bytes: number;
  created_at: string;
};

type ApiResponse = {
  projects?: ManagedProject[];
  project?: ManagedProject;
  documents?: ManagedDocument[];
  client_portal_path?: string;
  public_reference?: string;
  detail?: string;
};

const statusFilters = [
  { label: "Tous", value: "all" },
  { label: "Nouveaux", value: "received" },
  { label: "Avec devis", value: "with_quote" },
  { label: "Urgents", value: "urgent" },
];

const projectStatuses = [
  { label: "Nouveau", value: "received" },
  { label: "Documents manquants", value: "documents_needed" },
  { label: "Prêt pour revue", value: "ready_for_review" },
  { label: "Matching artisan", value: "contractor_matching" },
  { label: "Collecte devis", value: "quote_collection" },
  { label: "Décision client", value: "client_decision" },
  { label: "Fermé", value: "closed" },
];

export function ZamiTeamLeadsClient() {
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedProject, setSelectedProject] =
    useState<ManagedProject | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [accessKeyInput, setAccessKeyInput] = useState("");
  const [editStatus, setEditStatus] = useState("received");
  const [editNote, setEditNote] = useState("");
  const [editNextAction, setEditNextAction] = useState("");
  const [editClientPublicNote, setEditClientPublicNote] = useState("");
  const [editClientRequestedAction, setEditClientRequestedAction] = useState("");
  const [generatedClientLink, setGeneratedClientLink] = useState("");
  const [generatingClientLink, setGeneratingClientLink] = useState(false);
  const [managedDocuments, setManagedDocuments] = useState<ManagedDocument[]>(
    [],
  );
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  async function loadProjects(keyOverride?: string) {
    const key =
      keyOverride ||
      accessKey ||
      window.localStorage.getItem("zami_team_access_key") ||
      "";

    if (!key) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/backend/managed-projects?limit=100", {
        cache: "no-store",
        headers: {
          "X-ZAMI-Team-Key": key,
        },
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.detail || "Impossible de charger les leads.");
      }

      setProjects(data.projects || []);
      setAccessKey(key);
      window.localStorage.setItem("zami_team_access_key", key);
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

  async function saveTeamUpdate() {
    if (!selectedProject) {
      return;
    }

    const key =
      accessKey ||
      window.localStorage.getItem("zami_team_access_key") ||
      "";

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${selectedProject.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-ZAMI-Team-Key": key,
          },
          body: JSON.stringify({
            status: editStatus,
            internal_note: editNote,
            next_action: editNextAction,
        client_public_note: editClientPublicNote,
        client_requested_action: editClientRequestedAction,
          }),
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.project) {
        throw new Error(data.detail || "Impossible de sauvegarder.");
      }

      setSelectedProject(data.project);
      setProjects((current) =>
        current.map((project) =>
          project.id === data.project?.id ? data.project : project,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la sauvegarde.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function generateClientTrackingLink() {
    if (!selectedProject) {
      return;
    }

    const key =
      accessKey ||
      window.localStorage.getItem("zami_team_access_key") ||
      "";

    setGeneratingClientLink(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${selectedProject.id}/client-link`,
        {
          method: "POST",
          headers: {
            "X-ZAMI-Team-Key": key,
          },
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.client_portal_path) {
        throw new Error(
          data.detail || "Impossible de générer le lien client.",
        );
      }

      const fullLink = `${window.location.origin}${data.client_portal_path}`;
      setGeneratedClientLink(fullLink);

      if (window.navigator.clipboard) {
        await window.navigator.clipboard.writeText(fullLink);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la génération du lien client.",
      );
    } finally {
      setGeneratingClientLink(false);
    }
  }

  async function loadManagedDocuments(projectId: string) {
    const key =
      accessKey ||
      window.localStorage.getItem("zami_team_access_key") ||
      "";

    if (!key) {
      return;
    }

    setLoadingDocuments(true);

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${projectId}/documents`,
        {
          cache: "no-store",
          headers: {
            "X-ZAMI-Team-Key": key,
          },
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (response.ok) {
        setManagedDocuments(data.documents || []);
      }
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function downloadManagedDocument(document: ManagedDocument) {
    if (!selectedProject) {
      return;
    }

    const key =
      accessKey ||
      window.localStorage.getItem("zami_team_access_key") ||
      "";

    const response = await fetch(
      `/api/backend/managed-projects/${selectedProject.id}/documents/${document.id}/file`,
      {
        headers: {
          "X-ZAMI-Team-Key": key,
        },
      },
    );

    if (!response.ok) {
      setError("Impossible d’ouvrir le document.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = document.original_filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const savedKey = window.localStorage.getItem("zami_team_access_key") || "";

    if (savedKey) {
      setAccessKey(savedKey);
      setAccessKeyInput(savedKey);
      void loadProjects(savedKey);
    }
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      return;
    }

    setEditStatus(selectedProject.status || "received");
    setEditNote(selectedProject.internal_note || "");
    setEditNextAction(selectedProject.next_action || "");
    setEditClientPublicNote(selectedProject.client_public_note || "");
    setEditClientRequestedAction(selectedProject.client_requested_action || "");
    setGeneratedClientLink("");
    setManagedDocuments([]);
    void loadManagedDocuments(selectedProject.id);
  }, [selectedProject]);

  function submitAccessKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadProjects(accessKeyInput.trim());
  }

  function logoutTeam() {
    window.localStorage.removeItem("zami_team_access_key");
    setAccessKey("");
    setAccessKeyInput("");
    setProjects([]);
    setSelectedProject(null);
  }

  const filteredProjects = useMemo(() => {
    if (activeFilter === "with_quote") {
      return projects.filter((project) => project.has_quote);
    }

    if (activeFilter === "urgent") {
      return projects.filter((project) =>
        ["this_week", "this_month"].includes(project.urgency || ""),
      );
    }

    if (activeFilter === "received") {
      return projects.filter((project) => project.status === "received");
    }

    return projects;
  }, [projects, activeFilter]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      withQuote: projects.filter((project) => project.has_quote).length,
      urgent: projects.filter((project) =>
        ["this_week", "this_month"].includes(project.urgency || ""),
      ).length,
      withArtisan: projects.filter((project) => project.has_artisan).length,
    };
  }, [projects]);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>Espace opérationnel ZAMI</span>
          <h1>ZAMI Team Leads</h1>
          <p>
            Toutes les demandes “Confier mon projet” arrivent ici. Cette
            page centralise les demandes pour la première version opérationnelle.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button type="button" onClick={() => void loadProjects()}>
            <RefreshCw size={16} />
            Rafraîchir
          </button>

          {accessKey && (
            <button type="button" onClick={logoutTeam}>
              Déconnexion
            </button>
          )}
        </div>
      </header>

      {!accessKey && projects.length === 0 && (
        <form className={styles.accessCard} onSubmit={submitAccessKey}>
          <h2>Accès équipe ZAMI</h2>

          <p>
            Entrez le code interne pour consulter les leads. Les clients ne
            voient jamais cette page.
          </p>

          <input
            type="password"
            value={accessKeyInput}
            onChange={(event) => setAccessKeyInput(event.target.value)}
            placeholder="Code équipe"
            autoComplete="current-password"
          />

          {error && <div className={styles.accessError}>{error}</div>}

          <button type="submit">Ouvrir le dashboard</button>
        </form>
      )}

      {accessKey && (
        <>
          <div className={styles.statsGrid}>
            <article>
              <strong>{stats.total}</strong>
              <span>Total leads</span>
            </article>

            <article>
              <strong>{stats.urgent}</strong>
              <span>Urgents</span>
            </article>

            <article>
              <strong>{stats.withQuote}</strong>
              <span>Avec devis</span>
            </article>

            <article>
              <strong>{stats.withArtisan}</strong>
              <span>Avec artisan</span>
            </article>
          </div>

          <div className={styles.filters}>
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  activeFilter === filter.value ? styles.filterActive : ""
                }
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className={styles.stateBox}>
              <RefreshCw size={18} />
              Chargement des leads...
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {!loading && !error && filteredProjects.length === 0 && (
            <div className={styles.stateBox}>
              <CheckCircle2 size={18} />
              Aucun lead pour ce filtre.
            </div>
          )}

          <div className={styles.leadGrid}>
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className={styles.leadCard}
                onClick={() => setSelectedProject(project)}
              >
                <div className={styles.cardTop}>
                  <span>{projectLabel(project.project_type)}</span>
                  <small>{statusLabel(project.status)}</small>
                </div>

                <h2>{project.contact_name}</h2>

                <p className={styles.referenceLine}>
                  {project.public_reference || project.id}
                </p>

                <p className={styles.description}>
                  {project.description || "Pas de description fournie."}
                </p>

                <div className={styles.infoList}>
                  <span>
                    <Home size={14} />
                    {project.address}
                  </span>

                  <span>
                    <Mail size={14} />
                    {project.contact_email}
                  </span>

                  {project.contact_phone && (
                    <span>
                      <Phone size={14} />
                      {project.contact_phone}
                    </span>
                  )}

                  <span>
                    <CalendarClock size={14} />
                    {urgencyLabel(project.urgency)}
                  </span>
                </div>

                <div className={styles.badges}>
                  <span>
                    {project.has_quote ? "Devis reçu" : "Sans devis"}
                  </span>
                  <span>
                    {project.has_artisan
                      ? "Artisan existant"
                      : "Pas d’artisan"}
                  </span>
                  <span>{budgetLabel(project.budget_range)}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {selectedProject && (
        <div
          className={styles.overlay}
          onClick={() => setSelectedProject(null)}
        >
          <aside
            className={styles.drawer}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setSelectedProject(null)}
            >
              Fermer
            </button>

            <span className={styles.drawerTag}>{selectedProject.id}</span>

            <h2>{selectedProject.contact_name}</h2>

            <div className={styles.clientLinkBox}>
              <small>Numéro de demande</small>

              <strong>
                {selectedProject.public_reference || selectedProject.id}
              </strong>

              <button
                type="button"
                onClick={() => void generateClientTrackingLink()}
                disabled={generatingClientLink}
              >
                {generatingClientLink
                  ? "Génération..."
                  : "Générer lien suivi client"}
              </button>

              {generatedClientLink && (
                <p>
                  Lien copié: <span>{generatedClientLink}</span>
                </p>
              )}
            </div>

            <TeamProjectProgressBox
              project={selectedProject}
              accessKey={accessKey}
            />

            <TeamProjectOfferBox
              project={selectedProject}
              accessKey={accessKey}
            />

            <TeamProjectPhotosBox
              projectId={selectedProject.id}
              accessKey={accessKey}
            />

            <div className={styles.crmBox}>
              <h3>Suivi interne</h3>

              <label>
                Statut
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value)}
                >
                  {projectStatuses.map((statusOption) => (
                    <option
                      key={statusOption.value}
                      value={statusOption.value}
                    >
                      {statusOption.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Next action
                <input
                  value={editNextAction}
                  onChange={(event) =>
                    setEditNextAction(event.target.value)
                  }
                  placeholder="Ex: appeler client, demander DPE, vérifier devis..."
                />
              </label>

              <label>
                Note interne
                <textarea
                  rows={5}
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  placeholder="Notes visibles uniquement par l’équipe ZAMI."
                />
              </label>

              <button
                type="button"
                onClick={() => void saveTeamUpdate()}
                disabled={saving}
              >
                <Save size={15} />
                {saving ? "Sauvegarde..." : "Sauvegarder le suivi"}
              </button>
            </div>

            <ManagedProjectBriefBox
              projectId={selectedProject.id}
              accessKey={accessKey}
            />

            <div className={styles.drawerSection}>
              <h3>Documents ajoutés</h3>

              {loadingDocuments && <p>Chargement des documents...</p>}

              {!loadingDocuments && managedDocuments.length === 0 && (
                <p>Aucun document ajouté pour ce lead.</p>
              )}

              {!loadingDocuments &&
                managedDocuments.map((document) => (
                  <div key={document.id} className={styles.documentRow}>
                    <div>
                      <strong>{documentTypeLabel(document.document_type)}</strong>
                      <span>{document.original_filename}</span>
                      <small>{formatSize(document.size_bytes)}</small>
                    </div>

                    <button
                      type="button"
                      onClick={() => void downloadManagedDocument(document)}
                    >
                      Ouvrir
                    </button>
                  </div>
                ))}
            </div>

            <div className={styles.drawerSection}>
              <h3>Contact</h3>

              <p>
                <User size={15} />
                {selectedProject.contact_name}
              </p>

              <p>
                <Mail size={15} />
                {selectedProject.contact_email}
              </p>

              <p>
                <Phone size={15} />
                {selectedProject.contact_phone || "Non précisé"}
              </p>

              <p>
                Préférence:{" "}
                <strong>
                  {selectedProject.preferred_contact || "Non précisée"}
                </strong>
              </p>
            </div>

            <div className={styles.drawerSection}>
              <h3>Projet</h3>

              <p>
                <Building2 size={15} />
                {projectLabel(selectedProject.project_type)}
              </p>

              <p>
                <Home size={15} />
                {selectedProject.address} {selectedProject.city || ""}
              </p>

              <p>
                Type logement:{" "}
                <strong>
                  {propertyTypeLabel(selectedProject.property_type)}
                </strong>
              </p>

              <p>
                Surface:{" "}
                <strong>
                  {selectedProject.surface_m2
                    ? `${selectedProject.surface_m2} m²`
                    : "Non précisée"}
                </strong>
              </p>

              <p>
                DPE:{" "}
                <strong>{selectedProject.dpe_class || "Non connu"}</strong>
              </p>
            </div>

            <div className={styles.drawerSection}>
              <h3>Situation</h3>

              <p>
                Urgence:{" "}
                <strong>{urgencyLabel(selectedProject.urgency)}</strong>
              </p>

              <p>
                Devis déjà reçu:{" "}
                <strong>{selectedProject.has_quote ? "Oui" : "Non"}</strong>
              </p>

              <p>
                Artisan déjà trouvé:{" "}
                <strong>
                  {selectedProject.has_artisan ? "Oui" : "Non"}
                </strong>
              </p>

              <p>
                Budget:{" "}
                <strong>{budgetLabel(selectedProject.budget_range)}</strong>
              </p>
            </div>

            <div className={styles.drawerSection}>
              <h3>Description</h3>
              <p>{selectedProject.description || "Non précisée."}</p>
            </div>

            <div className={styles.nextActions}>
              <h3>Next actions recommandées</h3>

              <ul>
                <li>Vérifier si DPE, photos ou devis sont nécessaires.</li>
                <li>Préparer un brief clair du projet.</li>
                <li>Recontacter le client.</li>
                <li>Ne contacter aucun artisan sans revue humaine.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
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
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function projectLabel(value?: string) {
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

function budgetLabel(value?: string) {
  const labels: Record<string, string> = {
    under_5k: "Moins de 5 000 €",
    "5k_15k": "5 000 € – 15 000 €",
    "15k_40k": "15 000 € – 40 000 €",
    "40k_plus": "Plus de 40 000 €",
  };

  return labels[value || ""] || "Budget non précisé";
}

function propertyTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    apartment: "Appartement",
    house: "Maison",
    building: "Immeuble",
    unknown: "Je ne sais pas",
  };

  return labels[value || ""] || value || "Non précisé";
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    received: "Nouveau",
    documents_needed: "Documents manquants",
    ready_for_review: "Prêt pour revue",
    contractor_matching: "Matching artisan",
    quote_collection: "Collecte devis",
    client_decision: "Décision client",
    closed: "Fermé",
  };

  return labels[value || ""] || value || "Nouveau";
}
