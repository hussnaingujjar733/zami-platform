"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HardHat, MessageCircle, UserCheck } from "lucide-react";

import styles from "./ClientProjectProgressBox.module.css";

type ClientProject = {
  contractor_name?: string;
  contractor_company?: string;
  current_phase?: string;
  work_progress_percent?: number;
};

type ProjectUpdate = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

type ProjectResponse = {
  project?: ClientProject;
  updates?: ProjectUpdate[];
};

export function ClientProjectProgressBox({
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
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);

  useEffect(() => {
    if (!projectId || !token) {
      return;
    }

    async function loadProgress() {
      const projectResponse = await fetch(
        `/api/backend/client-projects/${projectId}?token=${encodeURIComponent(
          token,
        )}`,
      );

      if (projectResponse.ok) {
        const data = (await projectResponse.json()) as ProjectResponse;
        setProject(data.project || null);
      }

      const updatesResponse = await fetch(
        `/api/backend/client-projects/${projectId}/updates?token=${encodeURIComponent(
          token,
        )}`,
      );

      if (updatesResponse.ok) {
        const data = (await updatesResponse.json()) as ProjectResponse;
        setUpdates(data.updates || []);
      }
    }

    void loadProgress();
  }, [projectId, token]);

  if (!project) {
    return null;
  }

  const progress = Math.max(
    0,
    Math.min(100, Number(project.work_progress_percent || 0)),
  );

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <HardHat size={18} />
        <div>
          <span>Suivi chantier</span>
          <h2>Avancement de votre projet</h2>
        </div>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressTop}>
          <span>{project.current_phase || "Dossier en cours de revue"}</span>
          <strong>{progress}%</strong>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {(project.contractor_name || project.contractor_company) && (
        <div className={styles.contractor}>
          <UserCheck size={16} />
          <div>
            <small>Professionnel référent</small>
            <strong>
              {project.contractor_name || "Artisan ZAMI"}
              {project.contractor_company
                ? ` · ${project.contractor_company}`
                : ""}
            </strong>
          </div>
        </div>
      )}

      {updates.length > 0 && (
        <div className={styles.timeline}>
          <h3>
            <MessageCircle size={15} />
            Mises à jour ZAMI
          </h3>

          {updates.map((update) => (
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
