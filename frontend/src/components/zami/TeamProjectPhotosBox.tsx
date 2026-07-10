"use client";

import { FormEvent, useEffect, useState } from "react";
import { Camera, CheckCircle2, ImagePlus } from "lucide-react";

import styles from "./TeamProjectPhotosBox.module.css";

type TeamPhoto = {
  id: string;
  title?: string;
  caption?: string;
  original_filename?: string;
  created_at: string;
};

type ApiResponse = {
  photos?: TeamPhoto[];
  photo?: TeamPhoto;
  detail?: string;
};

export function TeamProjectPhotosBox({
  projectId,
  accessKey,
}: {
  projectId: string;
  accessKey: string;
}) {
  const [photos, setPhotos] = useState<TeamPhoto[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function loadPhotos() {
    try {
      const response = await fetch(
        `/api/backend/managed-projects/${projectId}/photos`,
        {
          headers: {
            "X-ZAMI-Team-Key": accessKey,
          },
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (response.ok) {
        setPhotos(data.photos || []);
      }
    } catch {
      // dashboard silent load
    }
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Ajoutez une photo avant d’envoyer.");
      return;
    }

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("caption", caption);
      formData.append("file", file);

      const response = await fetch(
        `/api/backend/managed-projects/${projectId}/photos`,
        {
          method: "POST",
          headers: {
            "X-ZAMI-Team-Key": accessKey,
          },
          body: formData,
        },
      );

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.detail || "Impossible d’ajouter la photo.");
      }

      setTitle("");
      setCaption("");
      setFile(null);
      setNotice("Photo ajoutée au suivi client.");
      await loadPhotos();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant l’envoi de la photo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <Camera size={16} />
        <div>
          <h3>Photos chantier</h3>
          <p>Ajoutez des preuves visuelles visibles côté client.</p>
        </div>
      </div>

      <form className={styles.form} onSubmit={uploadPhoto}>
        <label>
          Titre
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Avant travaux / Installation en cours"
          />
        </label>

        <label>
          Commentaire client
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Message visible avec la photo..."
          />
        </label>

        <label>
          Photo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>

        {previewUrl && (
          <img className={styles.preview} src={previewUrl} alt="Aperçu" />
        )}

        <button type="submit" disabled={uploading}>
          <ImagePlus size={14} />
          {uploading ? "Envoi..." : "Ajouter la photo"}
        </button>
      </form>

      {notice && (
        <p className={styles.notice}>
          <CheckCircle2 size={13} />
          {notice}
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {photos.length > 0 && (
        <div className={styles.list}>
          {photos.slice(0, 6).map((photo) => (
            <article key={photo.id}>
              <strong>{photo.title || photo.original_filename || "Photo"}</strong>
              {photo.caption && <p>{photo.caption}</p>}
              <small>{new Date(photo.created_at).toLocaleString("fr-FR")}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
