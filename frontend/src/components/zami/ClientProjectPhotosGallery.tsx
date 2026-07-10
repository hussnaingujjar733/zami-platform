"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";

import styles from "./ClientProjectPhotosGallery.module.css";

type ClientPhoto = {
  id: string;
  title?: string;
  caption?: string;
  created_at: string;
  image_path: string;
};

type ApiResponse = {
  photos?: ClientPhoto[];
};

export function ClientProjectPhotosGallery({
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

  const [photos, setPhotos] = useState<ClientPhoto[]>([]);

  useEffect(() => {
    if (!projectId || !token) {
      return;
    }

    async function loadPhotos() {
      const response = await fetch(
        `/api/backend/client-projects/${projectId}/photos?token=${encodeURIComponent(
          token,
        )}`,
      );

      if (response.ok) {
        const data = (await response.json()) as ApiResponse;
        setPhotos(data.photos || []);
      }
    }

    void loadPhotos();
  }, [projectId, token]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <Camera size={18} />
        <div>
          <span>Photos chantier</span>
          <h2>Suivi visuel du projet</h2>
        </div>
      </div>

      <div className={styles.grid}>
        {photos.map((photo) => (
          <article key={photo.id} className={styles.card}>
            <img
              src={`/api/backend${photo.image_path}`}
              alt={photo.title || "Photo chantier ZAMI"}
            />

            <div>
              <strong>{photo.title || "Photo chantier"}</strong>
              {photo.caption && <p>{photo.caption}</p>}
              <small>{new Date(photo.created_at).toLocaleString("fr-FR")}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
