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
    const session = getSession();

    if (session) {
      router.replace(session.user.role === "GESTOR" ? "/dashboard" : "/tickets");
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

      router.replace(result.user.role === "GESTOR" ? "/dashboard" : "/tickets");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.wordmark}>Slanko</p>
        <div className={styles.heroBody}>
          <p className={styles.headline}>Cada contrato com o prazo e a margem à vista.</p>
          <p className={styles.lead}>
            Chamados, SLA e custo das horas no mesmo lugar, para microempresas de TI que precisam saber
            quanto cada cliente realmente custa.
          </p>
        </div>
        <p className={styles.footnote}>Projeto de TCC em Engenharia de Software, Católica SC</p>
      </section>

      <main className={styles.formWrap}>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.formHead}>
            <h1>Entrar</h1>
            <p className="muted">Acesse com seu email e senha.</p>
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

          <button className={`btn btn-primary ${styles.submit}`} type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <p className={styles.devNote}>
            Ambiente local: os campos já vêm com o gestor do seed. Técnico:{" "}
            <span className="num">tecnico@slanko.local</span>, mesma senha.
          </p>
        </form>
      </main>
    </div>
  );
}
