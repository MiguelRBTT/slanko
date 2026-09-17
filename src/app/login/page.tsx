"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { getSession, saveSession, type SessionUser } from "@/lib/client/auth-session";
import type { LoginResult } from "@/types/auth";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("gestor@slanko.local");
  const [password, setPassword] = useState("Slanko@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await apiRequest<LoginResult>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });

      saveSession({
        token: result.token,
        user: result.user as SessionUser,
      });

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={`${styles.hero} animate-rise`}>
        <p className={styles.eyebrow}>Operação de suporte</p>
        <h1 className={styles.brand}>Slanko</h1>
        <p className={styles.lead}>
          Chamados, SLA e rentabilidade no mesmo lugar, para microempresas de TI que precisam ver
          margem e não só tickets.
        </p>
      </section>

      <div className={styles.formWrap}>
      <form className={`${styles.form} animate-rise-delay`} onSubmit={onSubmit}>
        <div>
          <h2>Entrar</h2>
          <p className="muted">Use as credenciais do seed local para testar.</p>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Acessar painel"}
        </button>
      </form>
      </div>
    </div>
  );
}
