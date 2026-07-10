"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileSignature, Send } from "lucide-react";

import styles from "./TeamProjectOfferBox.module.css";

type ProjectLite = {
  id: string;
  zami_offer_status?: string;
  zami_offer_title?: string;
  zami_offer_summary?: string;
  zami_offer_amount_eur?: number | null;
  zami_offer_start_date?: string;
  zami_offer_duration?: string;
};

export function TeamProjectOfferBox({
  project,
  accessKey,
}: {
  project: ProjectLite;
  accessKey: string;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(project.zami_offer_title || "");
    setSummary(project.zami_offer_summary || "");
    setAmount(
      project.zami_offer_amount_eur
        ? String(project.zami_offer_amount_eur)
        : "",
    );
    setStartDate(project.zami_offer_start_date || "");
    setDuration(project.zami_offer_duration || "");
    setStatus(project.zami_offer_status || "draft");
  }, [project.id]);

  async function saveOffer(nextStatus = status) {
    setSaving(true);
    setNotice("");
    setError("");

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
            zami_offer_status: nextStatus,
            zami_offer_title: title,
            zami_offer_summary: summary,
            zami_offer_amount_eur: amount ? Number(amount) : null,
            zami_offer_start_date: startDate,
            zami_offer_duration: duration,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Impossible d’enregistrer l’offre.");
      }

      setStatus(nextStatus);
      setNotice(
        nextStatus === "sent"
          ? "Offre envoyée côté client."
          : "Offre enregistrée.",
      );
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

  return (
    <section className={styles.box}>
      <div className={styles.heading}>
        <FileSignature size={16} />
        <div>
          <h3>Offre ZAMI</h3>
          <p>Préparez l’offre visible dans le portail client.</p>
        </div>
      </div>

      <div className={styles.statusLine}>
        Statut: <strong>{status || "draft"}</strong>
      </div>

      <div className={styles.grid}>
        <label>
          Titre de l’offre
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Offre rénovation énergétique"
          />
        </label>

        <label>
          Montant estimé / proposé (€)
          <input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Ex: 8500"
          />
        </label>

        <label>
          Date de démarrage prévue
          <input
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            placeholder="Ex: Septembre 2026"
          />
        </label>

        <label>
          Durée estimée
          <input
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="Ex: 2 à 3 semaines"
          />
        </label>

        <label className={styles.full}>
          Résumé client
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Expliquez clairement ce qui est inclus dans l’offre ZAMI..."
          />
        </label>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={() => void saveOffer("draft")} disabled={saving}>
          Enregistrer brouillon
        </button>

        <button type="button" onClick={() => void saveOffer("sent")} disabled={saving}>
          <Send size={14} />
          Envoyer au client
        </button>
      </div>

      {notice && (
        <p className={styles.notice}>
          <CheckCircle2 size={13} />
          {notice}
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}
