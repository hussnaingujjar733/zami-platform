"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { FormEvent, useState } from "react";

import styles from "./RetrouverDemandeClient.module.css";

type LookupResponse = {
  success?: boolean;
  client_portal_path?: string;
  project?: {
    id: string;
    public_reference?: string;
    status: string;
    project_type: string;
    address: string;
  };
  detail?: string;
};

export function RetrouverDemandeClient() {
  const [publicReference, setPublicReference] = useState("");
  const [email, setEmail] = useState("");
  const [portalPath, setPortalPath] = useState("");
  const [foundReference, setFoundReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setPortalPath("");

    try {
      const response = await fetch("/api/backend/client-projects/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          public_reference: publicReference.trim(),
          contact_email: email.trim(),
        }),
      });

      const data = (await response.json()) as LookupResponse;

      if (!response.ok || !data.client_portal_path) {
        throw new Error(
          data.detail || "Impossible de retrouver cette demande.",
        );
      }

      setPortalPath(data.client_portal_path);
      setFoundReference(data.project?.public_reference || publicReference);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur pendant la recherche.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} />
        Retour à l’accueil
      </Link>

      <header className={styles.hero}>
        <span>Suivi de demande</span>

        <h1>Retrouver ma demande ZAMI</h1>

        <p>
          Entrez votre numéro de demande et l’email utilisé lors de l’envoi
          du formulaire. ZAMI générera un nouveau lien sécurisé de suivi.
        </p>
      </header>

      <form className={styles.card} onSubmit={submitLookup}>
        <label>
          Numéro de demande
          <input
            value={publicReference}
            onChange={(event) =>
              setPublicReference(event.target.value.toUpperCase())
            }
            placeholder="ZAMI-REQ-2026-123456"
            required
          />
        </label>

        <label>
          Email utilisé
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@email.fr"
            required
          />
        </label>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={16} className={styles.spinner} />
              Recherche...
            </>
          ) : (
            <>
              <Search size={16} />
              Retrouver ma demande
            </>
          )}
        </button>
      </form>

      {portalPath && (
        <section className={styles.successCard}>
          <CheckCircle2 size={25} />

          <h2>Demande retrouvée</h2>

          <p>
            Numéro: <strong>{foundReference}</strong>
          </p>

          <Link href={portalPath}>Ouvrir le suivi de ma demande</Link>
        </section>
      )}
    </section>
  );
}
