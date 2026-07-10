"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, HardHat, MessageSquarePlus, Save } from "lucide-react";

import styles from "./TeamProjectProgressBox.module.css";

type ProjectLite = {
  id: string;
  contractor_name?: string;
  contractor_company?: string;
  current_phase?: string;
  work_progress_percent?: number;
};

type ProjectUpdate = {
  id: string;
  title: string;
  message: string;
  visibility: string;
  created_at: string;
};

type ApiResponse = {
  updates?: ProjectUpdate[];
  detail?: string;
};

export function TeamProjectProgressBox({
  project,
  accessKey,
}: {
  project: ProjectLite;
  accessKey: string;
}) {
  const [contractorName, setContractorName] = useState("");
  const [contractorCompany, setContractorCompany] = useState("");
  const [currentPhase, setCurrentPhase] = useState("");
  const [progress, setProgress] = useState(0);

  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setContractorName(project.contractor_name || "");
    setContractorCompany(project.contractor_company || "");
    setCurrentPhase(project.current_phase || "");
    setProgress(project.work_progress_percent || 0);
    void loadUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  async function loadUpdates() {
    try {
      const response = await fetch(
        `/api/backend/managed-projects/${project.id}/updates`,
        {
          headers: {
            "X-ZAMI-Team-Key": accessKey,
          },
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (response.ok) {
        setUpdates(data.updates || []);
      }
    } catch {
      // silent for dashboard
    }
  }

  async function saveProgress() {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${project.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-ZAMI-Team-Key": accessKey,
          },
          body: JSON.stringify({
            contractor_name: contractorName,
            contractor_company: contractorCompany,
            current_phase: currentPhase,
            work_progress_percent: Number(progress) || 0,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible d’enregistrer.");
      }

      setNotice("Progression enregistrée.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant l’enregistrement.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPosting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/backend/managed-projects/${project.id}/updates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ZAMI-Team-Key": accessKey,
          },
          body: JSON.stringify({
            title: updateTitle,
            message: updateMessage,
            visibility: "client",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible d’ajouter la mise à jour.");
      }

      setUpdateTitle("");
      setUpdateMessage("");
      setNotice("Mise à jour ajoutée côté client.");
      await loadUpdates();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant l’ajout.",
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <HardHat size={16} />
        <div>
          <h3>Suivi chantier client</h3>
          <p>Visible dans le portail client après connexion.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <label>
          Artisan référent
          <input
            value={contractorName}
            onChange={(event) => setContractorName(event.target.value)}
            placeholder="Ex: Jean Martin"
          />
        </label>

        <label>
          Entreprise
          <input
            value={contractorCompany}
            onChange={(event) => setContractorCompany(event.target.value)}
            placeholder="Ex: Martin Rénovation"
          />
        </label>

        <label>
          Phase actuelle
          <input
            value={currentPhase}
            onChange={(event) => setCurrentPhase(event.target.value)}
            placeholder="Ex: Devis validé / Chantier en préparation"
          />
        </label>

        <label>
          Avancement %
          <input
            type="number"
            min="0"
            max="100"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
          />
        </label>
      </div>

      <button type="button" onClick={saveProgress} disabled={saving}>
        <Save size={14} />
        {saving ? "Enregistrement..." : "Enregistrer le suivi"}
      </button>

      <form className={styles.updateForm} onSubmit={addUpdate}>
        <h4>
          <MessageSquarePlus size={14} />
          Ajouter une mise à jour client
        </h4>

        <input
          value={updateTitle}
          onChange={(event) => setUpdateTitle(event.target.value)}
          placeholder="Titre: Visite planifiée"
          required
        />

        <textarea
          value={updateMessage}
          onChange={(event) => setUpdateMessage(event.target.value)}
          placeholder="Message visible par le client..."
          required
        />

        <button type="submit" disabled={posting}>
          {posting ? "Ajout..." : "Ajouter au suivi client"}
        </button>
      </form>

      {notice && (
        <p className={styles.notice}>
          <CheckCircle2 size={13} />
          {notice}
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {updates.length > 0 && (
        <div className={styles.timeline}>
          {updates.slice(0, 4).map((update) => (
            <article key={update.id}>
              <strong>{update.title}</strong>
              <p>{update.message}</p>
              <small>{new Date(update.created_at).toLocaleString("fr-FR")}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
