"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Home,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";

import styles from "./ConfierProjetClient.module.css";

type ManagedProject = {
  id: string;
  public_reference?: string;
  status: string;
  project_type: string;
  address: string;
  city: string;
  contact_name: string;
  contact_email: string;
  created_at: string;
  admin_notification_status: string;
  n8n_status: string;
  client_access_token?: string;
  client_portal_path?: string;
};

type ApiResponse = {
  success?: boolean;
  project?: ManagedProject;
  team_notification?: {
    status: string;
    outbox_path?: string;
    note?: string;
  };
  notification?: {
    status: string;
    admin_email: string;
    outbox_path?: string;
    note?: string;
  };
  detail?: string;
};

const initialForm = {
  project_type: "renovation_complete",
  address: "",
  city: "",
  property_type: "apartment",
  surface_m2: "",
  dpe_class: "",
  urgency: "this_month",
  has_quote: "no",
  has_artisan: "no",
  budget_range: "",
  description: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  preferred_contact: "email",
  consent: false,
};

export function ConfierProjetClient() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [createdProject, setCreatedProject] =
    useState<ManagedProject | null>(null);
  const [notificationStatus, setNotificationStatus] = useState("");
  const [error, setError] = useState("");
  const [documentType, setDocumentType] = useState("dpe");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  async function submitManagedProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...form,
        surface_m2: form.surface_m2
          ? Number(form.surface_m2)
          : null,
        has_quote: form.has_quote === "yes",
        has_artisan: form.has_artisan === "yes",
      };

      const response = await fetch("/api/backend/managed-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.project) {
        throw new Error(
          data.detail ||
            "Votre demande n’a pas pu être enregistrée.",
        );
      }

      setCreatedProject(data.project);
      setNotificationStatus(
        data.team_notification?.status ||
          data.notification?.status ||
          "",
      );
      window.localStorage.setItem(
        "zami_managed_project_id",
        data.project.id,
      );

      if (data.project.client_portal_path) {
        window.localStorage.setItem(
          "zami_client_portal_path",
          data.project.client_portal_path,
        );
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant l’envoi de la demande.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadManagedDocument() {
    if (!createdProject || !documentFile) {
      return;
    }

    setUploadingDocument(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("file", documentFile);

      const response = await fetch(
        `/api/backend/managed-projects/${createdProject.id}/documents`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Le document n’a pas pu être ajouté.",
        );
      }

      setUploadedDocuments((current) => [
        data.document?.original_filename || documentFile.name,
        ...current,
      ]);
      setDocumentFile(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Erreur pendant l’ajout du document.",
      );
    } finally {
      setUploadingDocument(false);
    }
  }

  function updateField(
    field: keyof typeof initialForm,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (createdProject) {
    return (
      <section className={styles.page}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          Retour à l’accueil
        </Link>

        <div className={styles.successHero}>
          <span>
            <CheckCircle2 size={26} />
          </span>

          <h1>Votre projet est confié à ZAMI</h1>

          <p>
            Votre demande a été enregistrée. ZAMI va préparer le
            dossier, identifier les éléments manquants et vous
            recontacter pour la prochaine étape.
          </p>

          <div className={styles.successMeta}>
            <article>
              <small>Numéro de demande</small>
              <strong>
                {createdProject.public_reference || createdProject.id}
              </strong>
            </article>

            <article>
              <small>Équipe ZAMI informée</small>
              <strong>{notificationLabel(notificationStatus)}</strong>
            </article>

            <article>
              <small>Suivi client</small>
              <strong>Dossier en préparation</strong>
            </article>
          </div>
        </div>

        <section className={styles.timelineCard}>
          <h2>Parcours ZAMI</h2>

          {[
            [
              "Demande reçue",
              "Votre demande est sauvegardée dans ZAMI.",
              true,
            ],
            [
              "Analyse du dossier",
              "ZAMI relit les informations, documents et risques.",
              false,
            ],
            [
              "Documents manquants",
              "DPE, devis, photos, décennale, RGE ou autres preuves peuvent être demandés.",
              false,
            ],
            [
              "Préparation du brief",
              "Un dossier clair sera préparé pour contacter des professionnels.",
              false,
            ],
            [
              "Matching artisans",
              "Étape future : sélection de professionnels adaptés.",
              false,
            ],
            [
              "Revue humaine ZAMI",
              "Aucun contact automatique sans validation humaine.",
              false,
            ],
          ].map(([title, detail, active]) => (
            <article
              key={title as string}
              className={active ? styles.stepActive : styles.step}
            >
              <CheckCircle2 size={18} />

              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.documentUploadCard}>
          <h2>Ajouter des documents au dossier</h2>

          <p>
            Vous pouvez ajouter un DPE, un devis, des photos ou un audit.
            L’équipe ZAMI les ajoutera à votre dossier de suivi.
          </p>

          <div className={styles.documentUploadGrid}>
            <label>
              Type de document
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
              >
                <option value="dpe">DPE</option>
                <option value="quote">Devis</option>
                <option value="photo">Photos du logement</option>
                <option value="energy_bill">Facture énergie</option>
                <option value="audit">Audit énergétique</option>
                <option value="plan">Plan</option>
                <option value="other">Autre</option>
              </select>
            </label>

            <label>
              Fichier
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt"
                onChange={(event) =>
                  setDocumentFile(event.target.files?.[0] || null)
                }
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void uploadManagedDocument()}
            disabled={!documentFile || uploadingDocument}
          >
            {uploadingDocument ? "Ajout en cours..." : "Ajouter au dossier"}
          </button>

          {uploadedDocuments.length > 0 && (
            <div className={styles.uploadedList}>
              <strong>Documents ajoutés</strong>

              {uploadedDocuments.map((filename) => (
                <span key={filename}>{filename}</span>
              ))}
            </div>
          )}
        </section>

        <div className={styles.successActions}>
          {createdProject.client_portal_path && (
            <Link href={createdProject.client_portal_path}>
              Accéder à mon suivi de demande
            </Link>
          )}

          <Link href="/retrouver-ma-demande">
            Retrouver ma demande
          </Link>
          <Link href="/quote-check">Vérifier un devis</Link>
          <Link href="/analyse">Analyser un autre logement</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      <header className={styles.hero}>
        <span>Projet accompagné</span>

        <h1>Confiez votre projet à ZAMI</h1>

        <p>
          Décrivez votre logement, vos besoins et votre situation.
          ZAMI prépare un dossier clair avant de contacter des
          professionnels ou comparer des devis.
        </p>
      </header>

      <div className={styles.valueGrid}>
        <article>
          <ClipboardList size={22} />
          <strong>Dossier structuré</strong>
          <p>Résumé du logement, besoins, documents et priorités.</p>
        </article>

        <article>
          <ShieldCheck size={22} />
          <strong>Points de vigilance</strong>
          <p>Documents manquants, preuves artisan et risques à vérifier.</p>
        </article>

        <article>
          <Home size={22} />
          <strong>Préparation chantier</strong>
          <p>Brief utilisable pour demander ou comparer des devis.</p>
        </article>
      </div>

      <form
        className={styles.formCard}
        onSubmit={(event) => void submitManagedProject(event)}
      >
        <section>
          <h2>1. Votre projet</h2>

          <div className={styles.gridTwo}>
            <label>
              Type de projet *
              <select
                value={form.project_type}
                onChange={(event) =>
                  updateField("project_type", event.target.value)
                }
                required
              >
                <option value="renovation_complete">
                  Rénovation complète
                </option>
                <option value="insulation">Isolation</option>
                <option value="windows">Fenêtres / menuiseries</option>
                <option value="heating">Chauffage</option>
                <option value="ventilation">Ventilation</option>
                <option value="unknown">Je ne sais pas encore</option>
              </select>
            </label>

            <label>
              Urgence
              <select
                value={form.urgency}
                onChange={(event) =>
                  updateField("urgency", event.target.value)
                }
              >
                <option value="this_week">Cette semaine</option>
                <option value="this_month">Ce mois-ci</option>
                <option value="three_months">Dans 3 mois</option>
                <option value="not_urgent">Pas urgent</option>
              </select>
            </label>
          </div>

          <label>
            Description du besoin
            <textarea
              rows={5}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Exemple : appartement ancien, fenêtres à changer, chauffage coûteux, devis déjà reçu..."
            />
          </label>
        </section>

        <section>
          <h2>2. Logement concerné</h2>

          <div className={styles.gridTwo}>
            <label>
              Adresse *
              <input
                value={form.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                placeholder="Adresse du logement"
                required
              />
            </label>

            <label>
              Ville
              <input
                value={form.city}
                onChange={(event) =>
                  updateField("city", event.target.value)
                }
                placeholder="Paris, Lyon, Lille..."
              />
            </label>

            <label>
              Type de logement
              <select
                value={form.property_type}
                onChange={(event) =>
                  updateField("property_type", event.target.value)
                }
              >
                <option value="apartment">Appartement</option>
                <option value="house">Maison</option>
                <option value="building">Immeuble</option>
                <option value="unknown">Je ne sais pas</option>
              </select>
            </label>

            <label>
              Surface approximative
              <input
                type="number"
                min="1"
                value={form.surface_m2}
                onChange={(event) =>
                  updateField("surface_m2", event.target.value)
                }
                placeholder="Ex: 65"
              />
            </label>

            <label>
              DPE connu
              <select
                value={form.dpe_class}
                onChange={(event) =>
                  updateField("dpe_class", event.target.value)
                }
              >
                <option value="">Je ne sais pas</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </select>
            </label>

            <label>
              Budget indicatif
              <select
                value={form.budget_range}
                onChange={(event) =>
                  updateField("budget_range", event.target.value)
                }
              >
                <option value="">Non précisé</option>
                <option value="under_5k">Moins de 5 000 €</option>
                <option value="5k_15k">5 000 € – 15 000 €</option>
                <option value="15k_40k">15 000 € – 40 000 €</option>
                <option value="40k_plus">Plus de 40 000 €</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h2>3. Situation actuelle</h2>

          <div className={styles.gridTwo}>
            <label>
              Avez-vous déjà un devis ?
              <select
                value={form.has_quote}
                onChange={(event) =>
                  updateField("has_quote", event.target.value)
                }
              >
                <option value="no">Non</option>
                <option value="yes">Oui</option>
              </select>
            </label>

            <label>
              Avez-vous déjà un artisan ?
              <select
                value={form.has_artisan}
                onChange={(event) =>
                  updateField("has_artisan", event.target.value)
                }
              >
                <option value="no">Non</option>
                <option value="yes">Oui</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <h2>4. Contact</h2>

          <div className={styles.gridTwo}>
            <label>
              Nom *
              <input
                value={form.contact_name}
                onChange={(event) =>
                  updateField("contact_name", event.target.value)
                }
                placeholder="Votre nom"
                required
              />
            </label>

            <label>
              Email *
              <input
                type="email"
                value={form.contact_email}
                onChange={(event) =>
                  updateField("contact_email", event.target.value)
                }
                placeholder="vous@email.fr"
                required
              />
            </label>

            <label>
              Téléphone
              <input
                value={form.contact_phone}
                onChange={(event) =>
                  updateField("contact_phone", event.target.value)
                }
                placeholder="+33..."
              />
            </label>

            <label>
              Préférence de contact
              <select
                value={form.preferred_contact}
                onChange={(event) =>
                  updateField(
                    "preferred_contact",
                    event.target.value,
                  )
                }
              >
                <option value="email">Email</option>
                <option value="phone">Téléphone</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
          </div>
        </section>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(event) =>
              updateField("consent", event.target.checked)
            }
            required
          />

          <span>
            J’accepte que ZAMI utilise ces informations pour analyser ma
            demande et me recontacter au sujet de mon projet.
          </span>
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={submitting}
        >
          <span>
            {submitting
              ? "Envoi de la demande..."
              : "Confier mon projet à ZAMI"}
          </span>
        </button>

        <p className={styles.footerNote}>
          Aucun professionnel n’est contacté automatiquement. Une revue
          humaine ZAMI est prévue avant toute mise en relation.
        </p>
      </form>

      <section className={styles.contactNote}>
        <Mail size={18} />
        <span>Demande reçue par ZAMI.</span>
        <Phone size={18} />
        <span>Vous recevrez un retour après revue de votre dossier.</span>
      </section>
    </section>
  );
}

function notificationLabel(value: string) {
  if (value.endsWith("_sent")) {
    return "Envoyée sur Équipe ZAMI";
  }

  if (value.endsWith("_outbox_only")) {
    return "Équipe ZAMI en attente";
  }

  if (value.endsWith("_failed")) {
    return "Équipe ZAMI à vérifier";
  }

  if (value === "sent") {
    return "Email envoyé";
  }

  if (value === "outbox_only") {
    return "Demande enregistrée";
  }

  return "En attente";
}
