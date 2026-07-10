"use client";

import Link from "next/link";
import {
  Download,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSearch,
  FileText,
  ClipboardCheck,
  Copy,
  ImagePlus,
  LoaderCircle,
  Mail,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useEffect, useState } from "react";

import styles from "./QuoteGuardStandalone.module.css";

type UploadedEvidence = {
  id: string;
  project_id: string;
  evidence_type: string;
  original_filename: string;
  file_kind: string;
  size_bytes: number;
  analysis_status: string;
};

type QuoteCheck = {
  status: string;
  generated_at: string;
  quote_file: {
    filename: string;
    size_bytes: number;
  };
  quality_score: number;
  detected_amounts: {
    amount_eur: number;
    context: string;
  }[];
  work_categories: {
    code: string;
    matched_keywords: string[];
  }[];
  field_checks: {
    code: string;
    label: string;
    present: boolean;
  }[];
  red_flags: {
    severity: string;
    title: string;
    detail: string;
  }[];
  decision: {
    ready_for_signature: boolean;
    human_review_required: boolean;
    reason: string;
  };
  limitations: string[];
  text_extract?: {
    characters: number;
    preview: string;
    extraction_method: string;
    ocr_confidence: number | null;
    pages_or_images: number;
    source_file: string;
    warnings: string[];
  };
  authenticity_assessment?: {
    score: number;
    level: string;
    summary: string;
    important_note: string;
    checks: {
      label: string;
      present: boolean;
      detail: string;
    }[];
  };
  company_identifiers?: {
    siren: string | null;
    siret: string | null;
    detected: boolean;
    official_verification_status: string;
    official_verification_note: string;
  };
  amount_summary?: {
    main_total_eur: number | null;
    other_amounts_eur: number[];
    note: string;
  };
  official_company_verification?: {
    provider: string;
    status: string;
    queried_identifier: string | null;
    official_name: string | null;
    siren: string | null;
    siret: string | null;
    active: boolean | null;
    raw_administrative_status: string | null;
    naf_code: string | null;
    address: string | null;
    matching_identifier: boolean;
    notes: string[];
  };
};

type ApiError = {
  detail?:
    | string
    | {
        message?: string;
        missing?: string[];
      };
};

const PROJECT_KEY = "zami_quoteguard_project_id";

const categoryLabels: Record<string, string> = {
  isolation_toiture_combles: "Isolation toiture / combles",
  isolation_murs: "Isolation murs",
  fenetres_menuiseries: "Fenêtres / menuiseries",
  chauffage: "Chauffage",
  ventilation: "Ventilation",
  audit_dpe: "Audit / DPE",
};

export function QuoteGuardStandalone() {
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofType, setProofType] = useState("insurance_certificate");
  const [uploads, setUploads] = useState<UploadedEvidence[]>([]);
  const [quoteCheck, setQuoteCheck] = useState<QuoteCheck | null>(null);

  const [creating, setCreating] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deletingEvidenceId, setDeletingEvidenceId] = useState("");
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [artisanEmail, setArtisanEmail] = useState("");
  const [companyIdentifierInput, setCompanyIdentifierInput] = useState("");
  const [verifyingCompany, setVerifyingCompany] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void prepareProject();
  }, []);

  useEffect(() => {
    if (!quoteCheck) {
      return;
    }

    const identifier =
      quoteCheck.company_identifiers?.siret ||
      quoteCheck.company_identifiers?.siren ||
      quoteCheck.official_company_verification?.siret ||
      quoteCheck.official_company_verification?.siren ||
      "";

    setCompanyIdentifierInput(identifier);
  }, [quoteCheck]);


  async function prepareProject() {
    setCreating(true);
    setError("");

    try {
      const existingProjectId =
        window.localStorage.getItem(PROJECT_KEY);

      if (existingProjectId) {
        setProjectId(existingProjectId);
        await loadEvidence(existingProjectId);
        await loadExistingQuoteCheck(existingProjectId);
        return;
      }

      const response = await fetch("/api/backend/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address_label: "QuoteGuard direct quote check",
          address: {
            mode: "quote_check_only",
          },
          snapshot: {
            mode: "quote_check_only",
            address_required: false,
          },
        }),
      });

      const payload = await readPayload<{
        id?: string;
        detail?: string;
      }>(response);

      if (!response.ok || !payload.id) {
        throw new Error(
          payload.detail ||
            "Le projet QuoteGuard n’a pas pu être créé.",
        );
      }

      window.localStorage.setItem(PROJECT_KEY, payload.id);
      window.localStorage.setItem("zami_project_id", payload.id);
      setProjectId(payload.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la préparation de QuoteGuard.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function loadExistingQuoteCheck(activeProjectId: string) {
    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          activeProjectId,
        )}/quote-check`,
        {
          cache: "no-store",
        },
      );

      if (response.status === 404) {
        return;
      }

      const payload = await readPayload<{
        quote_check?: QuoteCheck;
      }>(response);

      if (response.ok && payload.quote_check) {
        setQuoteCheck(payload.quote_check);
        window.localStorage.setItem(
          "zami_quote_check",
          JSON.stringify(payload.quote_check),
        );
      }
    } catch {
      // Non-blocking: upload flow should still work.
    }
  }

  async function loadEvidence(activeProjectId: string) {
    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          activeProjectId,
        )}/evidence`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const payload = await readPayload<{
        evidence?: UploadedEvidence[];
      }>(response);

      setUploads(payload.evidence || []);
    } finally {
      setCreating(false);
    }
  }

  async function uploadSelectedFile() {
    if (!projectId || !file) {
      setError("Ajoutez un devis PDF ou une image du devis.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("evidence_type", "quote");
      formData.append("file", file);

      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/evidence`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await readPayload<{
        evidence?: UploadedEvidence;
        detail?: string;
      }>(response);

      if (!response.ok || !payload.evidence) {
        throw new Error(
          payload.detail || "Le fichier n’a pas pu être ajouté.",
        );
      }

      setUploads((current) => [payload.evidence!, ...current]);
      setFile(null);

      await runQuoteCheck();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant l’upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function uploadProofFile() {
    if (!projectId || !proofFile) {
      setError("Ajoutez un document de preuve artisan.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("evidence_type", proofType);
      formData.append("file", proofFile);

      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/evidence`,
        {
          method: "POST",
          body: formData,
        },
      );

      const payload = await readPayload<{
        evidence?: UploadedEvidence;
        detail?: string;
      }>(response);

      if (!response.ok || !payload.evidence) {
        throw new Error(
          payload.detail || "La preuve n’a pas pu être ajoutée.",
        );
      }

      setUploads((current) => [payload.evidence!, ...current]);
      setProofFile(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant l’upload de la preuve.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function runQuoteCheck() {
    if (!projectId) {
      return;
    }

    setChecking(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/quote-check/run`,
        {
          method: "POST",
          cache: "no-store",
        },
      );

      const payload = await readPayload<{
        quote_check?: QuoteCheck;
      } & ApiError>(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      if (!payload.quote_check) {
        throw new Error("Aucun résultat n’a été retourné.");
      }

      setQuoteCheck(payload.quote_check);
      window.localStorage.setItem(
        "zami_quote_check",
        JSON.stringify(payload.quote_check),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La vérification a échoué.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function deleteUploadedFile(evidenceId: string) {
    if (!projectId || !evidenceId) {
      return;
    }

    const confirmed = window.confirm(
      "Supprimer ce fichier du contrôle QuoteGuard ?",
    );

    if (!confirmed) {
      return;
    }

    setDeletingEvidenceId(evidenceId);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/evidence/${encodeURIComponent(evidenceId)}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );

      const payload = await readPayload<{
        success?: boolean;
        detail?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(
          payload.detail || "Le fichier n’a pas pu être supprimé.",
        );
      }

      setUploads((current) =>
        current.filter((item) => item.id !== evidenceId),
      );

      try {
        await fetch(
          `/api/backend/projects/${encodeURIComponent(
            projectId,
          )}/quote-check`,
          {
            method: "DELETE",
            cache: "no-store",
          },
        );
      } catch {
        // Non-blocking: local result reset still works.
      }

      setQuoteCheck(null);
      window.localStorage.removeItem("zami_quote_check");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la suppression du fichier.",
      );
    } finally {
      setDeletingEvidenceId("");
    }
  }

  async function copyContractorRequest() {
    if (!quoteCheck) {
      return;
    }

    const message = buildContractorRequestMessage(quoteCheck);

    try {
      await navigator.clipboard.writeText(message);
      setCopiedRequest(true);

      window.setTimeout(() => {
        setCopiedRequest(false);
      }, 2200);
    } catch {
      setError(
        "Impossible de copier automatiquement. Sélectionnez le message manuellement.",
      );
    }
  }

  async function startNewQuoteCheck() {
    const confirmed = window.confirm(
      "Démarrer un nouveau contrôle ? Les fichiers et le résultat actuels seront retirés de cette session.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setFile(null);
    setProofFile(null);
    setProofType("insurance_certificate");
    setUploads([]);
    setQuoteCheck(null);
    setCopiedRequest(false);
    setArtisanEmail("");
    setCompanyIdentifierInput("");

    const oldProjectId = projectId;

    window.localStorage.removeItem(PROJECT_KEY);
    window.localStorage.removeItem("zami_quote_check");
    window.localStorage.removeItem("zami_project_id");

    if (oldProjectId) {
      try {
        await fetch(
          `/api/backend/projects/${encodeURIComponent(oldProjectId)}`,
          {
            method: "DELETE",
            cache: "no-store",
          },
        );
      } catch {
        // Non-blocking: local reset still works.
      }
    }

    await prepareProject();
  }

  async function verifyManualCompanyIdentifier() {
    if (!projectId || !quoteCheck) {
      return;
    }

    const digits = companyIdentifierInput.replace(/\D/g, "");

    if (![9, 14].includes(digits.length)) {
      setError("Ajoutez un SIREN à 9 chiffres ou un SIRET à 14 chiffres.");
      return;
    }

    setVerifyingCompany(true);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/projects/${encodeURIComponent(
          projectId,
        )}/quote-check/company-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            identifier: digits,
          }),
        },
      );

      const payload = await readPayload<{
        quote_check?: QuoteCheck;
        detail?: string;
      }>(response);

      if (!response.ok || !payload.quote_check) {
        throw new Error(
          payload.detail ||
            "La vérification officielle n’a pas pu être relancée.",
        );
      }

      setQuoteCheck(payload.quote_check);
      window.localStorage.setItem(
        "zami_quote_check",
        JSON.stringify(payload.quote_check),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la vérification officielle.",
      );
    } finally {
      setVerifyingCompany(false);
    }
  }

  const hasPdf = uploads.some(
    (item) =>
      item.evidence_type === "quote" && item.file_kind === "pdf",
  );

  if (creating) {
    return (
      <section className={styles.loading}>
        <LoaderCircle size={36} className={styles.spinner} />
        <h1>Préparation de QuoteGuard…</h1>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        Retour
      </Link>

      <header className={styles.hero}>
        <span>QuoteGuard par ZAMI</span>

        <h1>Vérifiez un devis avant de signer</h1>

        <p>
          Ajoutez directement un devis PDF ou une photo. ZAMI détecte
          les montants, mentions manquantes, qualifications, conditions
          de paiement et signaux d’alerte.
        </p>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.newCheckButton}
            onClick={() => void startNewQuoteCheck()}
            disabled={uploading || checking}
          >
            <RotateCcw size={16} />
            Nouveau contrôle
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.uploadCard}>
          <div className={styles.cardHeading}>
            <UploadCloud size={24} />

            <div>
              <span>Étape 1</span>
              <h2>Ajouter votre devis</h2>
            </div>
          </div>

          <label className={styles.dropzone}>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
              }}
            />

            {file ? (
              <>
                {file.type === "application/pdf" ? (
                  <FileText size={34} />
                ) : (
                  <ImagePlus size={34} />
                )}

                <strong>{file.name}</strong>
                <small>{formatSize(file.size)}</small>
              </>
            ) : (
              <>
                <FileSearch size={38} />
                <strong>PDF ou photo du devis</strong>
                <small>
                  PDF recommandé, photo possible avec OCR.
                </small>
              </>
            )}
          </label>

          <button
            type="button"
            disabled={!file || uploading}
            onClick={() => void uploadSelectedFile()}
          >
            <span
              className={uploading ? styles.inlineIcon : styles.hiddenIcon}
              aria-hidden="true"
            >
              <LoaderCircle size={16} className={styles.spinner} />
            </span>

            <span
              className={uploading ? styles.hiddenIcon : styles.inlineIcon}
              aria-hidden="true"
            >
              <UploadCloud size={16} />
            </span>

            Ajouter et analyser
          </button>

          {!hasPdf && uploads.length > 0 && (
            <div className={styles.notice}>
              <AlertTriangle size={17} />
              Une image a été ajoutée. Pour l’analyse automatique
              complète, ajoutez aussi le PDF du devis. OCR image sera
              ajouté plus tard.
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <ShieldAlert size={18} />
              {error}
            </div>
          )}

          <div className={styles.proofUploadBox}>
            <div className={styles.proofHeader}>
              <ShieldAlert size={18} />

              <div>
                <strong>Ajouter une preuve artisan</strong>
                <small>
                  Attestation décennale, RGE, extrait SIRENE/KBIS ou autre document.
                </small>
              </div>
            </div>

            <select
              value={proofType}
              onChange={(event) => setProofType(event.target.value)}
            >
              <option value="insurance_certificate">
                Attestation décennale
              </option>
              <option value="rge_certificate">
                Certificat RGE
              </option>
              <option value="company_registration">
                Extrait SIRENE / KBIS
              </option>
              <option value="artisan_proof">
                Autre preuve artisan
              </option>
            </select>

            <label className={styles.proofFilePicker}>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  setProofFile(event.target.files?.[0] || null);
                }}
              />

              {proofFile ? proofFile.name : "Choisir un fichier preuve"}
            </label>

            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!proofFile || uploading}
              onClick={() => void uploadProofFile()}
            >
              <UploadCloud size={16} />
              Ajouter la preuve
            </button>
          </div>

          {uploads.length > 0 && (
            <div className={styles.uploadList}>
              <strong>Fichiers ajoutés</strong>

              {uploads.map((item) => (
                <article key={item.id}>
                  {item.file_kind === "pdf" ? (
                    <FileText size={18} />
                  ) : (
                    <ImagePlus size={18} />
                  )}

                  <div>
                    <span>{item.original_filename}</span>
                    <small>
                      {evidenceTypeLabel(item.evidence_type)} ·{" "}
                      {item.file_kind.toUpperCase()} ·{" "}
                      {formatSize(item.size_bytes)}
                    </small>
                  </div>

                  <button
                    type="button"
                    className={styles.deleteButton}
                    disabled={deletingEvidenceId === item.id}
                    onClick={() => void deleteUploadedFile(item.id)}
                    aria-label={`Supprimer ${item.original_filename}`}
                  >
                    {deletingEvidenceId === item.id ? (
                      <LoaderCircle
                        size={14}
                        className={styles.spinner}
                      />
                    ) : (
                      <Trash2 size={14} />
                    )}

                    Supprimer
                  </button>
                </article>
              ))}
            </div>
          )}

          {hasPdf && (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={checking}
              onClick={() => void runQuoteCheck()}
            >
              <span
                className={checking ? styles.inlineIcon : styles.hiddenIcon}
                aria-hidden="true"
              >
                <LoaderCircle
                  size={16}
                  className={styles.spinner}
                />
              </span>

              <span
                className={checking ? styles.hiddenIcon : styles.inlineIcon}
                aria-hidden="true"
              >
                <FileSearch size={16} />
              </span>

              Relancer la vérification
            </button>
          )}
        </section>

        <section className={styles.resultCard}>
          <div className={styles.cardHeading}>
            <ShieldAlert size={24} />

            <div>
              <span>Étape 2</span>
              <h2>Résultat du contrôle</h2>
            </div>
          </div>

          {!quoteCheck && (
            <div className={styles.emptyResult}>
              <FileSearch size={34} />

              <strong>Aucun résultat pour le moment</strong>

              <p>
                Ajoutez un devis PDF pour voir le score qualité, les
                montants détectés et les points de risque.
              </p>
            </div>
          )}

          {quoteCheck && (
            <>
              <div className={styles.scoreBox}>
                <small>Score qualité du devis</small>
                <strong>{quoteCheck.quality_score}%</strong>
                <span>{statusLabel(quoteCheck.status)}</span>
              </div>

              <div className={styles.proofChecklist}>
                <h3>Preuves artisan ajoutées</h3>

                {buildProofChecklist(uploads).map((item) => (
                  <article
                    key={item.label}
                    className={
                      item.provided
                        ? styles.proofProvided
                        : styles.proofMissing
                    }
                  >
                    {item.provided ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertTriangle size={16} />
                    )}

                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </article>
                ))}

                <p>
                  ZAMI vérifie ici la présence des documents. Le contenu
                  exact, l’authenticité et la validité doivent encore être
                  confirmés.
                </p>
              </div>

              <div className={styles.signingChecklist}>
                <h3>Checklist avant signature</h3>

                {buildSigningChecklist(quoteCheck).map((item) => (
                  <article
                    key={item.label}
                    className={
                      item.status === "ok"
                        ? styles.checkOk
                        : item.status === "risk"
                          ? styles.checkRisk
                          : styles.checkWarn
                    }
                  >
                    {item.status === "ok" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertTriangle size={16} />
                    )}

                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </article>
                ))}
              </div>

              <a
                className={styles.pdfButton}
                href={`/api/backend/projects/${encodeURIComponent(
                  projectId,
                )}/quote-check/report.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={16} />
                Télécharger le rapport QuoteGuard
              </a>

              <div
                className={`${styles.verdictBox} ${
                  buildQuoteVerdict(quoteCheck).level === "go"
                    ? styles.verdictGo
                    : buildQuoteVerdict(quoteCheck).level === "stop"
                      ? styles.verdictStop
                      : styles.verdictWarn
                }`}
              >
                <span>{buildQuoteVerdict(quoteCheck).badge}</span>

                <div>
                  <h3>{buildQuoteVerdict(quoteCheck).title}</h3>
                  <p>{buildQuoteVerdict(quoteCheck).detail}</p>
                </div>
              </div>

              {quoteCheck.text_extract && (
                <div className={styles.extractionBox}>
                  <h3>Source analysée</h3>

                  <div>
                    <span>Fichier</span>
                    <strong>{quoteCheck.text_extract.source_file}</strong>
                  </div>

                  <div>
                    <span>Méthode</span>
                    <strong>
                      {methodLabel(
                        quoteCheck.text_extract.extraction_method,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Confiance OCR</span>
                    <strong>
                      {quoteCheck.text_extract.ocr_confidence === null
                        ? "PDF texte"
                        : `${Math.round(
                            quoteCheck.text_extract.ocr_confidence * 100,
                          )}%`}
                    </strong>
                  </div>

                  <div>
                    <span>Texte lu</span>
                    <strong>
                      {quoteCheck.text_extract.characters} caractères
                    </strong>
                  </div>
                </div>
              )}

              {quoteCheck.authenticity_assessment && (
                <div className={styles.authBox}>
                  <h3>Indice d’authenticité</h3>

                  <strong>
                    {quoteCheck.authenticity_assessment.score}%
                  </strong>

                  <p>{quoteCheck.authenticity_assessment.summary}</p>

                  <small>
                    {quoteCheck.authenticity_assessment.important_note}
                  </small>

                  <div>
                    {quoteCheck.authenticity_assessment.checks.map(
                      (check) => (
                        <article key={check.label}>
                          {check.present ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            <AlertTriangle size={15} />
                          )}

                          <span>{check.label}</span>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              )}

              {(quoteCheck.amount_summary ||
                quoteCheck.company_identifiers) && (
                <div className={styles.summaryBox}>
                  <h3>Résumé lisible du devis</h3>

                  {quoteCheck.amount_summary?.main_total_eur && (
                    <article>
                      <span>Montant principal probable</span>
                      <strong>
                        {formatCurrency(
                          quoteCheck.amount_summary.main_total_eur,
                        )}
                      </strong>
                      <small>{quoteCheck.amount_summary.note}</small>
                    </article>
                  )}

                  {quoteCheck.amount_summary &&
                    quoteCheck.amount_summary.other_amounts_eur
                      .length > 0 && (
                      <article>
                        <span>Autres montants détectés</span>
                        <p>
                          {quoteCheck.amount_summary.other_amounts_eur
                            .map((value) => formatCurrency(value))
                            .join(" · ")}
                        </p>
                      </article>
                    )}

                  {quoteCheck.company_identifiers?.detected && (
                    <article>
                      <span>Identifiants entreprise détectés</span>
                      <p>
                        {quoteCheck.company_identifiers.siret
                          ? `SIRET: ${quoteCheck.company_identifiers.siret}`
                          : ""}
                        {quoteCheck.company_identifiers.siren
                          ? ` · SIREN: ${quoteCheck.company_identifiers.siren}`
                          : ""}
                      </p>

                      <small>
                        {quoteCheck.official_company_verification
                          ? officialStatusLabel(
                              quoteCheck.official_company_verification
                                .status,
                            )
                          : "Vérification officielle non encore effectuée."}
                      </small>
                    </article>
                  )}
                </div>
              )}

              {quoteCheck.official_company_verification && (
                <div className={styles.officialBox}>
                  <h3>Vérification officielle entreprise</h3>

                  <div className={styles.officialStatusRow}>
                    <span
                      className={
                        quoteCheck.official_company_verification.status ===
                        "verified"
                          ? styles.officialVerified
                          : quoteCheck.official_company_verification.status ===
                              "not_found"
                            ? styles.officialNotFound
                            : styles.officialWarning
                      }
                    >
                      {officialStatusLabel(
                        quoteCheck.official_company_verification.status,
                      )}
                    </span>

                    <small>
                      {quoteCheck.official_company_verification.provider}
                    </small>
                  </div>

                  <div className={styles.manualCompanyBox}>
                    <label htmlFor="manual-company-id">
                      Corriger SIREN / SIRET
                    </label>

                    <div>
                      <input
                        id="manual-company-id"
                        value={companyIdentifierInput}
                        placeholder="SIREN 9 chiffres ou SIRET 14 chiffres"
                        onChange={(event) =>
                          setCompanyIdentifierInput(event.target.value)
                        }
                      />

                      <button
                        type="button"
                        disabled={verifyingCompany}
                        onClick={() =>
                          void verifyManualCompanyIdentifier()
                        }
                      >
                        {verifyingCompany ? (
                          <LoaderCircle
                            size={14}
                            className={styles.spinner}
                          />
                        ) : (
                          <FileSearch size={14} />
                        )}

                        Vérifier
                      </button>
                    </div>

                    <small>
                      Utile si l’OCR a mal lu le SIRET/SIREN du devis.
                    </small>
                  </div>

                  {quoteCheck.official_company_verification
                    .official_name && (
                    <article>
                      <span>Nom officiel</span>
                      <strong>
                        {
                          quoteCheck.official_company_verification
                            .official_name
                        }
                      </strong>
                    </article>
                  )}

                  {(quoteCheck.official_company_verification.siret ||
                    quoteCheck.official_company_verification.siren) && (
                    <article>
                      <span>Identifiants officiels</span>
                      <p>
                        {quoteCheck.official_company_verification.siret
                          ? `SIRET: ${quoteCheck.official_company_verification.siret}`
                          : ""}
                        {quoteCheck.official_company_verification.siren
                          ? ` · SIREN: ${quoteCheck.official_company_verification.siren}`
                          : ""}
                      </p>
                    </article>
                  )}

                  {quoteCheck.official_company_verification.address && (
                    <article>
                      <span>Adresse officielle</span>
                      <p>
                        {quoteCheck.official_company_verification.address}
                      </p>
                    </article>
                  )}

                  <article>
                    <span>État administratif</span>
                    <p>
                      {quoteCheck.official_company_verification.active ===
                      true
                        ? "Entreprise active selon la source officielle"
                        : quoteCheck.official_company_verification.active ===
                            false
                          ? "Entreprise non active / fermée selon la source officielle"
                          : "État non déterminé automatiquement"}
                    </p>
                  </article>

                  <small className={styles.officialNote}>
                    RGE, assurance décennale et cohérence exacte du devis
                    restent à vérifier séparément.
                  </small>
                </div>
              )}

              <div className={styles.requestBox}>
                <div className={styles.requestHeader}>
                  <ClipboardCheck size={20} />

                  <div>
                    <h3>Message à envoyer à l’artisan</h3>
                    <p>
                      Demandez les preuves avant de signer ou payer un
                      acompte.
                    </p>
                  </div>
                </div>

                <pre>
                  {buildContractorRequestMessage(quoteCheck)}
                </pre>

                <button
                  type="button"
                  onClick={() => void copyContractorRequest()}
                >
                  <Copy size={15} />
                  {copiedRequest
                    ? "Message copié"
                    : "Copier le message"}
                </button>

                <div className={styles.emailRequestBox}>
                  <label htmlFor="artisan-email">
                    Email de l’artisan
                  </label>

                  <input
                    id="artisan-email"
                    type="email"
                    placeholder="exemple@entreprise.fr"
                    value={artisanEmail}
                    onChange={(event) =>
                      setArtisanEmail(event.target.value)
                    }
                  />

                  <a
                    className={
                      artisanEmail.trim()
                        ? styles.emailRequestButton
                        : styles.emailRequestButtonDisabled
                    }
                    href={
                      artisanEmail.trim()
                        ? buildContractorMailto(
                            artisanEmail,
                            quoteCheck,
                          )
                        : "#"
                    }
                    onClick={(event) => {
                      if (!artisanEmail.trim()) {
                        event.preventDefault();
                        setError(
                          "Ajoutez l’email de l’artisan pour préparer le message.",
                        );
                      }
                    }}
                  >
                    <Mail size={15} />
                    Préparer l’email
                  </a>
                </div>
              </div>

              {quoteCheck.detected_amounts.length > 0 && (
                <details className={styles.rawAmounts}>
                  <summary>
                    Voir les détails techniques des montants détectés
                  </summary>

                  <div className={styles.rawAmountList}>
                    {quoteCheck.detected_amounts
                      .slice(0, 4)
                      .map((item) => (
                        <article
                          key={`${item.amount_eur}-${item.context}`}
                        >
                          <strong>
                            {formatCurrency(item.amount_eur)}
                          </strong>

                          <p>{cleanContext(item.context)}</p>
                        </article>
                      ))}
                  </div>
                </details>
              )}

              {quoteCheck.work_categories.length > 0 && (
                <div className={styles.tags}>
                  <h3>Postes détectés</h3>

                  <div>
                    {quoteCheck.work_categories.map((item) => (
                      <span key={item.code}>
                        {categoryLabels[item.code] || item.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.fieldChecks}>
                <h3>Mentions importantes</h3>

                {quoteCheck.field_checks.map((field) => (
                  <article
                    key={field.code}
                    className={
                      field.present
                        ? styles.okField
                        : styles.riskField
                    }
                  >
                    {field.present ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertTriangle size={16} />
                    )}

                    <div>
                      <strong>{field.label}</strong>
                      <small>
                        {field.present
                          ? "Détecté"
                          : "Non détecté automatiquement"}
                      </small>
                    </div>
                  </article>
                ))}
              </div>

              {quoteCheck.red_flags.length > 0 && (
                <div className={styles.redFlags}>
                  <h3>Signaux d’alerte</h3>

                  {quoteCheck.red_flags.map((flag) => (
                    <article key={`${flag.title}-${flag.detail}`}>
                      <em>{severityLabel(flag.severity)}</em>

                      <div>
                        <strong>{flag.title}</strong>
                        <p>{flag.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className={styles.decisionBox}>
                <AlertTriangle size={18} />

                <div>
                  <strong>
                    Signature automatique non recommandée
                  </strong>

                  <p>{quoteCheck.decision.reason}</p>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

async function readPayload<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

function extractErrorMessage(payload: ApiError) {
  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (payload.detail?.message) {
    return payload.detail.message;
  }

  return "La vérification n’a pas pu être effectuée.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}








function buildProofChecklist(uploads: UploadedEvidence[]) {
  const hasType = (type: string) =>
    uploads.some((item) => item.evidence_type === type);

  const countType = (type: string) =>
    uploads.filter((item) => item.evidence_type === type).length;

  return [
    {
      label: "Devis principal",
      provided: hasType("quote"),
      detail: hasType("quote")
        ? `${countType("quote")} fichier devis ajouté`
        : "Ajoutez le devis PDF ou une photo lisible.",
    },
    {
      label: "Attestation décennale",
      provided: hasType("insurance_certificate"),
      detail: hasType("insurance_certificate")
        ? "Document fourni. Vérifier dates, activité couverte et nom de l’entreprise."
        : "À demander avant signature ou acompte.",
    },
    {
      label: "Certificat RGE",
      provided: hasType("rge_certificate"),
      detail: hasType("rge_certificate")
        ? "Document fourni. Vérifier domaine RGE et validité."
        : "À demander si aides publiques ou rénovation énergétique visées.",
    },
    {
      label: "Extrait SIRENE / KBIS",
      provided: hasType("company_registration"),
      detail: hasType("company_registration")
        ? "Document fourni. Comparer avec le SIREN/SIRET du devis."
        : "Utile pour confirmer l’identité de l’entreprise.",
    },
    {
      label: "Autres preuves artisan",
      provided: hasType("artisan_proof"),
      detail: hasType("artisan_proof")
        ? `${countType("artisan_proof")} autre preuve ajoutée`
        : "Photos, échanges, conditions, documents complémentaires.",
    },
  ];
}


function buildQuoteVerdict(quoteCheck: QuoteCheck) {
  const officialStatus =
    quoteCheck.official_company_verification?.status;

  const hasHighRisk = quoteCheck.red_flags.some(
    (flag) => flag.severity === "high",
  );

  const missingImportant = quoteCheck.field_checks.filter(
    (field) =>
      !field.present &&
      [
        "company_identity",
        "total_amount",
        "tva",
        "insurance",
        "payment_terms",
      ].includes(field.code),
  );

  const quality = quoteCheck.quality_score || 0;
  const authenticity =
    quoteCheck.authenticity_assessment?.score || 0;

  if (
    hasHighRisk ||
    quality < 45 ||
    authenticity < 45 ||
    officialStatus === "not_found"
  ) {
    return {
      level: "stop",
      badge: "⛔",
      title: "Ne signez pas pour le moment",
      detail:
        "Le devis contient un risque important ou une vérification officielle insuffisante. Demandez les preuves et relisez avant tout acompte.",
    };
  }

  if (
    missingImportant.length > 0 ||
    quality < 75 ||
    authenticity < 75 ||
    officialStatus === "unavailable" ||
    officialStatus === "possible_match"
  ) {
    return {
      level: "warn",
      badge: "⚠️",
      title: "Demandez des preuves avant signature",
      detail:
        "Le devis paraît exploitable, mais certaines informations doivent être confirmées par écrit avant signature.",
    };
  }

  return {
    level: "go",
    badge: "✅",
    title: "Avancer avec prudence",
    detail:
      "Le devis paraît structuré. Vérifiez quand même l’assurance, le RGE si applicable, et les conditions de paiement.",
  };
}


function buildSigningChecklist(quoteCheck: QuoteCheck) {
  const hasField = (code: string) =>
    quoteCheck.field_checks.some(
      (field) => field.code === code && field.present,
    );

  const missingField = (code: string) =>
    quoteCheck.field_checks.some(
      (field) => field.code === code && !field.present,
    );

  const official = quoteCheck.official_company_verification;
  const company = quoteCheck.company_identifiers;

  return [
    {
      label: "Montant total",
      status: quoteCheck.amount_summary?.main_total_eur
        ? "ok"
        : "risk",
      detail: quoteCheck.amount_summary?.main_total_eur
        ? `Montant principal probable : ${formatCurrency(
            quoteCheck.amount_summary.main_total_eur,
          )}`
        : "Montant total non détecté automatiquement.",
    },
    {
      label: "Entreprise / SIREN-SIRET",
      status:
        official?.status === "verified"
          ? "ok"
          : company?.detected
            ? "warn"
            : "risk",
      detail:
        official?.status === "verified"
          ? "Entreprise trouvée dans une source officielle."
          : company?.detected
            ? "Identifiant détecté, mais vérification officielle à confirmer."
            : "SIREN/SIRET non détecté clairement.",
    },
    {
      label: "TVA / HT / TTC",
      status: hasField("tva") ? "ok" : "risk",
      detail: hasField("tva")
        ? "Mentions TVA / HT / TTC détectées."
        : "Demander le détail HT, TVA et TTC par poste.",
    },
    {
      label: "Assurance décennale",
      status: hasField("insurance") ? "ok" : "warn",
      detail: hasField("insurance")
        ? "Mention détectée, attestation à demander."
        : "Attestation décennale à demander avant signature.",
    },
    {
      label: "Qualification RGE",
      status: quoteCheck.authenticity_assessment?.checks.some(
        (check) => check.label === "RGE" && check.present,
      )
        ? "ok"
        : "warn",
      detail:
        "À confirmer si le projet vise des aides publiques ou MaPrimeRénov’.",
    },
    {
      label: "Validité du devis",
      status: missingField("validity") ? "warn" : "ok",
      detail: missingField("validity")
        ? "Durée de validité non détectée, demandez une confirmation écrite."
        : "Durée de validité détectée.",
    },
    {
      label: "Paiement / acompte",
      status: hasField("payment_terms") ? "ok" : "warn",
      detail: hasField("payment_terms")
        ? "Conditions de paiement détectées."
        : "Demander acompte, échéances et solde avant signature.",
    },
  ] as const;
}



function buildContractorMailto(
  email: string,
  quoteCheck: QuoteCheck,
) {
  const subject = "Demande de justificatifs avant signature du devis";
  const body = buildContractorRequestMessage(quoteCheck);

  return `mailto:${encodeURIComponent(
    email.trim(),
  )}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}


function buildContractorRequestMessage(quoteCheck: QuoteCheck) {
  const missingFields = quoteCheck.field_checks
    .filter((field) => !field.present)
    .map((field) => field.label);

  const company = quoteCheck.company_identifiers;
  const official = quoteCheck.official_company_verification;
  const amount = quoteCheck.amount_summary?.main_total_eur;

  const lines = [
    "Bonjour,",
    "",
    "Merci pour votre devis. Avant toute signature ou paiement d’acompte, pourriez-vous me transmettre / confirmer les éléments suivants :",
    "",
  ];

  if (company?.siret || company?.siren) {
    lines.push(
      `- Confirmation de vos identifiants entreprise : ${
        company.siret ? `SIRET ${company.siret}` : ""
      }${company.siren ? ` / SIREN ${company.siren}` : ""}`,
    );
  } else {
    lines.push("- Votre SIRET/SIREN complet");
  }

  if (official?.status === "verified") {
    lines.push(
      "- Confirmation que l’entreprise indiquée dans le devis correspond bien à votre établissement officiel",
    );
  } else {
    lines.push(
      "- Un justificatif officiel de l’entreprise si le SIRET/SIREN ne correspond pas clairement au devis",
    );
  }

  lines.push(
    "- Une attestation d’assurance décennale à jour couvrant les travaux prévus",
    "- Une attestation de responsabilité civile professionnelle",
    "- La confirmation de votre qualification RGE si les aides publiques sont visées",
  );

  if (missingFields.length > 0) {
    lines.push(
      "- Les informations manquantes ou peu claires dans le devis : " +
        missingFields.join(", "),
    );
  }

  if (amount) {
    lines.push(
      `- Confirmation du montant total TTC du devis : ${formatCurrency(
        amount,
      )}`,
    );
  }

  lines.push(
    "- Le détail HT / TVA / TTC par poste de travaux",
    "- Les conditions de paiement, montant d’acompte, échéances et solde",
    "- La durée de validité du devis",
    "- Le délai prévisionnel de début et de fin des travaux",
    "",
    "Je souhaite simplement vérifier ces éléments avant de signer.",
    "",
    "Cordialement,",
  );

  return lines.join("\n");
}



function evidenceTypeLabel(value: string) {
  if (value === "quote") {
    return "Devis";
  }

  if (value === "insurance_certificate") {
    return "Décennale";
  }

  if (value === "rge_certificate") {
    return "RGE";
  }

  if (value === "company_registration") {
    return "SIRENE / KBIS";
  }

  if (value === "artisan_proof") {
    return "Preuve artisan";
  }

  return value;
}

function officialStatusLabel(status: string) {
  if (status === "verified") {
    return "Entreprise trouvée officiellement";
  }

  if (status === "possible_match") {
    return "Correspondance possible";
  }

  if (status === "not_found") {
    return "Non trouvée officiellement";
  }

  if (status === "unavailable") {
    return "Source officielle indisponible";
  }

  return "Non vérifié";
}

function cleanContext(value: string) {
  const compactedLetters = value.replace(
    /\b([A-Za-zÀ-ÿ])(?:\s+([A-Za-zÀ-ÿ])){2,}\b/g,
    (match) => match.replace(/\s+/g, ""),
  );

  const compactedDigits = compactedLetters.replace(
    /\b(\d)(?:\s+(\d)){2,}\b/g,
    (match) => match.replace(/\s+/g, ""),
  );

  const cleaned = compactedDigits
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 180) {
    return cleaned;
  }

  return `${cleaned.slice(0, 180)}…`;
}

function methodLabel(value: string) {
  if (value === "pdf_text") {
    return "Texte PDF direct";
  }

  if (value === "pdf_ocr") {
    return "OCR sur PDF scanné";
  }

  if (value === "image_ocr") {
    return "OCR sur image";
  }

  return value;
}

function statusLabel(status: string) {
  if (status === "structured") {
    return "Devis plutôt structuré";
  }

  if (status === "weak_quote") {
    return "Devis faible ou incomplet";
  }

  return "Revue nécessaire";
}

function severityLabel(value: string) {
  if (value === "high") {
    return "Risque élevé";
  }

  if (value === "medium") {
    return "Risque moyen";
  }

  return "À vérifier";
}
