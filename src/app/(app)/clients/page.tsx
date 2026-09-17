"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { PublicClient } from "@/types/client";
import styles from "../page-shared.module.css";

type ClientsPayload = { clients: PublicClient[] };
type ClientPayload = { client: PublicClient };

export default function ClientsPage() {
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest<ClientsPayload>("/api/clients");
      setClients(result.clients);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao listar clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest<ClientPayload>("/api/clients", {
        method: "POST",
        body: { name, email: email || null },
      });
      setName("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao criar cliente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Clientes</h1>
          <p className="muted">Cadastro base para contratos e chamados.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className={`${styles.formPanel} panel`} onSubmit={onCreate}>
        <h2>Novo cliente</h2>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Cadastrar"}
        </button>
      </form>

      <section className={`${styles.listPanel} panel`}>
        {loading ? (
          <p className="empty-state">Carregando…</p>
        ) : clients.length === 0 ? (
          <p className="empty-state">Nenhum cliente ativo.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.name}</strong>
                    </td>
                    <td>{client.email ?? "n/d"}</td>
                    <td>{client.phone ?? "n/d"}</td>
                    <td>
                      <span className={`badge ${client.active ? "badge-ok" : "badge-neutral"}`}>
                        {client.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
