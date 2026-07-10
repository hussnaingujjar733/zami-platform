"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  ImagePlus,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import styles from "./EvidenceUpload.module.css";

type EvidenceType =
  | "dpe"
  | "energy_audit"
  | "energy_bill"
  | "quote"
  | "facade"
  | "windows"
  | "roof_attic"
  | "heating_system"
  | "humidity";

type UploadedEvidence = {
  id: string;
  project_id: string;
  evidence_type: EvidenceType;
  original_filename: string;
  file_kind: string;
  size_bytes: number;
  verification_status: string;
  analysis_status: string;
  uploaded_at: string;
};

type Category = {
  id: EvidenceType;
  title: string;
  description: string;
  accept: string;
  kind: "document" | "photo";
};

const categories: Category[] = [
  {
    id: "dpe",
    title: "DPE du logement",
    description:
      "Diagnostic de performance énergétique officiel.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
    kind: "document",
  },
  {
    id: "energy_audit",
    title: "Audit énergétique",
    description:
      "Audit réglementaire ou étude énergétique disponible.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
    kind: "document",
  },
  {
    id: "energy_bill",
    title: "Facture énergétique",
    description:
      "Facture récente d’électricité, gaz ou autre énergie.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
    kind: "document",
  },
  {
    id: "quote",
    title: "Devis de rénovation",
    description:
      "Devis reçu d’un artisan ou d’une entreprise.",
    accept: ".pdf,.jpg,.jpeg,.png,.webp",
    kind: "document",
  },
  {
    id: "facade",
    title: "Photo de la façade",
    description:
      "Vue générale de l’extérieur du logement.",
    accept: ".jpg,.jpeg,.png,.webp",
    kind: "photo",
  },
  {
    id: "windows",
    title: "Photo des fenêtres",
    description:
      "Cadre, vitrage et joints visibles.",
    accept: ".jpg,.jpeg,.png,.webp",
    kind: "photo",
  },
  {
    id: "roof_attic",
    title: "Toiture ou combles",
    description:
      "Photo uniquement lorsque la zone est accessible sans risque.",
    accept: ".jpg,.jpeg,.png,.webp",
    kind: "photo",
  },
  {
    id: "heating_system",
    title: "Système de chauffage",
    description:
      "Équipement et étiquette technique lorsqu’elle est visible.",
    accept: ".jpg,.jpeg,.png,.webp",
    kind: "photo",
  },
  {
    id: "humidity",
    title: "Humidité visible",
    description:
      "Vue générale puis rapprochée de la zone concernée.",
    accept: ".jpg,.jpeg,.png,.webp",
    kind: "photo",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function EvidenceUpload() {
  const [projectId, setProjectId] = useState("");
  const [addressLabel, setAddressLabel] = useState(
    "Logement sélectionné",
  );
  const [uploads, setUploads] = useState<UploadedEvidence[]>([]);
  const [uploadingType, setUploadingType] =
    useState<EvidenceType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const snapshotRaw = window.localStorage.getItem(
        "zami_property_snapshot",
      );

      if (snapshotRaw) {
        const snapshot = JSON.parse(snapshotRaw);

        const label =
          snapshot?.address?.value?.label ||
          snapshot?.address?.label;

        if (label) {
          setAddressLabel(label);
        }
      }

      const storedProjectId =
        window.localStorage.getItem("zami_project_id");

      if (!storedProjectId) {
        setError(
          "Aucun projet permanent n’est associé à cette analyse.",
        );
      } else {
        setProjectId(storedProjectId);
      }

      const storedUploads = window.localStorage.getItem(
        "zami_uploaded_evidence",
      );

      if (storedUploads) {
        setUploads(JSON.parse(storedUploads));
      }
    } catch {
      setError(
        "Les informations locales du projet sont illisibles.",
      );
    }
  }, []);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    window.localStorage.setItem(
      "zami_uploaded_evidence",
      JSON.stringify(uploads),
    );
  }, [projectId, uploads]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void fetch(
      `/api/backend/projects/${encodeURIComponent(
        projectId,
      )}/evidence`,
      {
        cache: "no-store",
      },
    )
      .then(async (response) => {
        const text = await response.text();

        const payload = text
          ? JSON.parse(text)
          : {};

        if (!response.ok) {
          throw new Error(
            payload.detail ||
              "Impossible de charger les fichiers du projet.",
          );
        }

        setUploads(payload.evidence || []);
      })
      .catch((loadError) => {
        console.error(
          "Evidence loading failed:",
          loadError,
        );
      });
  }, [projectId]);

  const uploadedCategories = useMemo(
    () =>
      new Set(
        uploads.map((evidence) => evidence.evidence_type),
      ).size,
    [uploads],
  );

  async function handleFile(
    category: Category,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = "";

    if (!file) {
      return;
    }

    if (!projectId) {
      setError("La session du projet n’est pas prête.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Le fichier dépasse la limite de 10 Mo.");
      return;
    }

    setError("");
    setUploadingType(category.id);

    const formData = new FormData();

    formData.append("evidence_type", category.id);
    formData.append("file", file);

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/evidence`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !payload.evidence) {
        throw new Error(
          typeof payload.detail === "string"
            ? payload.detail
            : "Le fichier n’a pas pu être enregistré.",
        );
      }

      setUploads((current) => [
        ...current,
        payload.evidence as UploadedEvidence,
      ]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Le téléversement a échoué.",
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function deleteEvidence(
    evidence: UploadedEvidence,
  ) {
    setDeletingId(evidence.id);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/evidence/${encodeURIComponent(evidence.id)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          typeof payload.detail === "string"
            ? payload.detail
            : "La suppression a échoué.",
        );
      }

      setUploads((current) =>
        current.filter((item) => item.id !== evidence.id),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "La suppression a échoué.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/analyse/questions">
          <ArrowLeft size={16} />
          Retour au questionnaire
        </Link>

        <span>Étape 3 sur 4 · Documents et photos</span>
      </div>

      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            Preuves facultatives
          </span>

          <h1>
            Renforcez votre analyse avec des documents.
          </h1>

          <p>
            Ajoutez un DPE, une facture, un devis ou des photos.
            Chaque fichier restera marqué comme non vérifié tant que
            son contenu n’aura pas été analysé.
          </p>
        </div>

        <aside>
          <ShieldCheck size={23} />

          <div>
            <small>Logement concerné</small>
            <strong>{addressLabel}</strong>
          </div>
        </aside>
      </header>

      <div className={styles.summary}>
        <div>
          <span>Fichiers ajoutés</span>
          <strong>{uploads.length}</strong>
        </div>

        <div>
          <span>Catégories renseignées</span>
          <strong>
            {uploadedCategories}/{categories.length}
          </strong>
        </div>

        <div>
          <span>Statut</span>
          <strong>
            {uploads.length
              ? "Preuves enregistrées"
              : "Aucune preuve"}
          </strong>
        </div>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      <div className={styles.grid}>
        {categories.map((category) => {
          const uploadedCount = uploads.filter(
            (evidence) =>
              evidence.evidence_type === category.id,
          ).length;

          const isUploading =
            uploadingType === category.id;

          return (
            <article
              className={styles.card}
              key={category.id}
            >
              <div className={styles.cardHeader}>
                <span className={styles.icon}>
                  {category.kind === "document" ? (
                    <FileText size={22} />
                  ) : (
                    <ImagePlus size={22} />
                  )}
                </span>

                {uploadedCount > 0 && (
                  <span className={styles.successBadge}>
                    <CheckCircle2 size={13} />
                    {uploadedCount} ajouté
                    {uploadedCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <h2>{category.title}</h2>
              <p>{category.description}</p>

              <label className={styles.fileControl}>
                <span>
                  {isUploading ? (
                    <>
                      <LoaderCircle
                        className={styles.spinner}
                        size={16}
                      />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Choisir un fichier
                    </>
                  )}
                </span>

                <input
                  type="file"
                  accept={category.accept}
                  disabled={isUploading}
                  onChange={(event) =>
                    void handleFile(category, event)
                  }
                />
              </label>

              <small className={styles.help}>
                Maximum 10 Mo
              </small>
            </article>
          );
        })}
      </div>

      {uploads.length > 0 && (
        <section className={styles.filesSection}>
          <div className={styles.sectionHeading}>
            <div>
              <span>Fichiers reçus</span>
              <h2>Preuves associées au projet</h2>
            </div>

            <p>
              « Enregistré » confirme la réception, pas encore la
              validité du contenu.
            </p>
          </div>

          <div className={styles.fileList}>
            {uploads.map((evidence) => (
              <article
                className={styles.uploadedFile}
                key={evidence.id}
              >
                <span className={styles.fileIcon}>
                  {evidence.file_kind === "pdf" ? (
                    <FileText size={20} />
                  ) : (
                    <ImagePlus size={20} />
                  )}
                </span>

                <div>
                  <strong>
                    {evidence.original_filename}
                  </strong>

                  <small>
                    {labelForType(evidence.evidence_type)}
                    {" · "}
                    {formatSize(evidence.size_bytes)}
                  </small>
                </div>

                <span className={styles.pending}>
                  Analyse en attente
                </span>

                <button
                  type="button"
                  disabled={deletingId === evidence.id}
                  onClick={() =>
                    void deleteEvidence(evidence)
                  }
                  aria-label="Supprimer le fichier"
                >
                  {deletingId === evidence.id ? (
                    <LoaderCircle
                      className={styles.spinner}
                      size={17}
                    />
                  ) : (
                    <Trash2 size={17} />
                  )}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.actions}>
        <div>
          <ShieldCheck size={17} />

          <p>
            Une photographie ne permet pas de confirmer un défaut
            caché ou un diagnostic technique.
          </p>
        </div>

        <Link href="/analyse/report">
          Préparer mon rapport
          <ArrowRight size={16} />
        </Link>
      </footer>
    </section>
  );
}

function labelForType(type: EvidenceType) {
  const labels: Record<EvidenceType, string> = {
    dpe: "DPE",
    energy_audit: "Audit énergétique",
    energy_bill: "Facture énergétique",
    quote: "Devis",
    facade: "Façade",
    windows: "Fenêtres",
    roof_attic: "Toiture ou combles",
    heating_system: "Chauffage",
    humidity: "Humidité visible",
  };

  return labels[type];
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
