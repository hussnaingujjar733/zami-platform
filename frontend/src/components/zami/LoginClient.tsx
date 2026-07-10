"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Lock, UserPlus } from "lucide-react";

import styles from "./LoginClient.module.css";

type AuthResponse = {
  success?: boolean;
  project_id?: string;
  client_portal_path?: string;
  public_reference?: string;
  detail?: string;
};

export function LoginClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [publicReference, setPublicReference] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successText, setSuccessText] = useState("");

  useEffect(() => {
    const reference = searchParams.get("reference") || "";

    if (reference) {
      setMode("register");
      setPublicReference(reference);
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccessText("");

    try {
      const endpoint =
        mode === "register"
          ? "/api/backend/client-auth/register"
          : "/api/backend/client-auth/login";

      const payload =
        mode === "register"
          ? {
              public_reference: publicReference.trim(),
              contact_email: email.trim(),
              full_name: fullName.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as AuthResponse;

      if (!response.ok || !data.client_portal_path) {
        throw new Error(
          data.detail || "Impossible de créer ou connecter le compte.",
        );
      }

      const portalPath = data.client_portal_path || "";
      const portalUrl = new URL(portalPath, window.location.origin);
      const pathParts = portalUrl.pathname.split("/").filter(Boolean);
      const projectId = data.project_id || pathParts[pathParts.length - 1] || "";
      const token = portalUrl.searchParams.get("token") || "";

      window.localStorage.setItem("zami_client_project_id", projectId);
      window.localStorage.setItem("zami_client_token", token);
      window.localStorage.setItem("zami_client_reference", data.public_reference || "");
      window.localStorage.setItem("zami_client_portal_path", portalPath);

      setSuccessText("Compte validé. Redirection vers votre espace client...");

      window.setTimeout(() => {
        window.location.href = "/mon-espace";
      }, 650);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erreur de connexion.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.badge}>
          {mode === "register" ? <UserPlus size={15} /> : <Lock size={15} />}
          ZAMI Client
        </div>

        <h1>
          {mode === "register"
            ? "Créer votre compte propriétaire"
            : "Connexion à votre espace propriétaire"}
        </h1>

        <p>
          Utilisez votre numéro de demande ZAMI et l’email associé à votre
          projet. Une fois connecté, vous pourrez suivre l’avancement, les
          documents, les messages ZAMI et les prochaines étapes.
        </p>

        <div className={styles.switcher}>
          <button
            type="button"
            className={mode === "register" ? styles.active : ""}
            onClick={() => setMode("register")}
          >
            Créer compte
          </button>

          <button
            type="button"
            className={mode === "login" ? styles.active : ""}
            onClick={() => setMode("login")}
          >
            Connexion
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>
                Numéro de demande
                <input
                  value={publicReference}
                  onChange={(event) => setPublicReference(event.target.value)}
                  placeholder="ZAMI-REQ-2026-123456"
                  required
                />
              </label>

              <label>
                Nom complet
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Votre nom"
                />
              </label>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="votre@email.com"
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 caractères"
              minLength={8}
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          {successText && (
            <div className={styles.success}>
              <CheckCircle2 size={15} />
              {successText}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? "Traitement..."
              : mode === "register"
                ? "Créer mon compte"
                : "Me connecter"}
            <ArrowRight size={15} />
          </button>
        </form>

        <small>
          Le compte est réservé aux clients dont le dossier ZAMI est déjà
          identifié. Pour une nouvelle demande, commencez par “Confier mon
          projet”.
        </small>
      </section>
    </main>
  );
}
