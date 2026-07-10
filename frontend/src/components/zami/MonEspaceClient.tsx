"use client";

import { useEffect, useState } from "react";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";

import { ClientProjectOfferCard } from "./ClientProjectOfferCard";
import { ClientProjectPhotosGallery } from "./ClientProjectPhotosGallery";
import { ClientProjectProgressBox } from "./ClientProjectProgressBox";
import styles from "./MonEspaceClient.module.css";

type ClientSession = {
  projectId: string;
  token: string;
  reference: string;
  portalPath: string;
};

type ClientProject = {
  public_reference?: string;
  status?: string;
  address?: string;
  city?: string;
  client_public_note?: string;
  client_requested_action?: string;
};

type ApiResponse = {
  project?: ClientProject;
  detail?: string;
};

export function MonEspaceClient() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [project, setProject] = useState<ClientProject | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const projectId = window.localStorage.getItem("zami_client_project_id") || "";
    const token = window.localStorage.getItem("zami_client_token") || "";
    const reference = window.localStorage.getItem("zami_client_reference") || "";
    const portalPath = window.localStorage.getItem("zami_client_portal_path") || "";

    if (!projectId || !token) {
      setSession(null);
      return;
    }

    setSession({
      projectId,
      token,
      reference,
      portalPath,
    });
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const currentSession = session;

    async function loadProject() {
      setError("");

      try {
        const response = await fetch(
          `/api/backend/client-projects/${currentSession.projectId}?token=${encodeURIComponent(
            currentSession.token,
          )}`,
        );

        const data = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(data.detail || "Session client invalide.");
        }

        setProject(data.project || null);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Impossible de charger votre espace.",
        );
      }
    }

    void loadProject();
  }, [session]);

  function logout() {
    window.localStorage.removeItem("zami_client_project_id");
    window.localStorage.removeItem("zami_client_token");
    window.localStorage.removeItem("zami_client_reference");
    window.localStorage.removeItem("zami_client_portal_path");
    window.location.href = "/login";
  }

  if (!session) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyCard}>
          <ShieldCheck size={24} />
          <h1>Connexion requise</h1>
          <p>
            Connectez-vous pour accéder à votre espace client ZAMI sans lien
            long visible dans l’adresse.
          </p>
          <a href="/login">
            Connexion client
            <ArrowRight size={15} />
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span>Espace client ZAMI</span>
          <h1>Suivi de votre projet</h1>
          <p>
            Retrouvez l’avancement, les offres, les mises à jour et les photos
            liées à votre projet.
          </p>
        </div>

        <button type="button" onClick={logout}>
          <LogOut size={14} />
          Déconnexion
        </button>
      </section>

      <section className={styles.summary}>
        <div>
          <small>Numéro de demande</small>
          <strong>
            {project?.public_reference || session.reference || session.projectId}
          </strong>
        </div>

        <div>
          <small>Statut</small>
          <strong>{project?.status || "En cours"}</strong>
        </div>

        <div>
          <small>Adresse</small>
          <strong>
            {project?.address
              ? `${project.address}${project.city ? `, ${project.city}` : ""}`
              : "Projet ZAMI"}
          </strong>
        </div>
      </section>

      {(project?.client_public_note || project?.client_requested_action) && (
        <section className={styles.messageBox}>
          {project.client_public_note && (
            <div>
              <small>Message ZAMI</small>
              <strong>{project.client_public_note}</strong>
            </div>
          )}

          {project.client_requested_action && (
            <div>
              <small>Action demandée</small>
              <strong>{project.client_requested_action}</strong>
            </div>
          )}
        </section>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <ClientProjectOfferCard
        projectIdOverride={session.projectId}
        tokenOverride={session.token}
      />

      <ClientProjectProgressBox
        projectIdOverride={session.projectId}
        tokenOverride={session.token}
      />

      <ClientProjectPhotosGallery
        projectIdOverride={session.projectId}
        tokenOverride={session.token}
      />

      {session.portalPath && (
        <section className={styles.backupLink}>
          <p>Besoin du lien de suivi classique ?</p>
          <a href={session.portalPath}>Ouvrir le lien sécurisé</a>
        </section>
      )}
    </main>
  );
}
