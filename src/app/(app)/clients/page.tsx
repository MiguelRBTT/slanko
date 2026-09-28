"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { displayOrFallback } from "@/lib/client/format";
import type { PublicClient } from "@/types/client";
import styles from "../page-shared.module.css";

type ClientsPayload = { clients: PublicClient[] };
type ClientPayload = { client: PublicClient };

export default function ClientsPage() {
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

  function resetForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
  }

  function startEdit(client: PublicClient) {
    setEditingId(client.id);
    setName(client.name);
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        await apiRequest<ClientPayload>(`/api/clients/${editingId}`, {
          method: "PUT",
          body: {
            name,
            email: email || null,
            phone: phone || null,
          },
        });
      } else {
        await apiRequest<ClientPayload>("/api/clients", {
          method: "POST",
          body: {
            name,
            email: email || null,
            phone: phone || null,
          },
        });
      }

      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : editingId
            ? "Falha ao atualizar cliente"
            : "Falha ao criar cliente",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivateClient(client: PublicClient) {
    const confirmed = window.confirm(
      `Desativar o cliente "${client.name}"? Ele deixará de aparecer nas listas ativas.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await apiRequest(`/api/clients/${client.id}`, { method: "DELETE" });
      if (editingId === client.id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao desativar cliente");
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

      <form className={`${styles.formPanel} panel`} onSubmit={onSubmit}>
        <h2>{editingId ? "Editar cliente" : "Novo cliente"}</h2>
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
          <div className="field">
            <label htmlFor="phone">Telefone</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className={styles.formActions}>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar"}
          </button>
          {editingId ? (
            <button className="btn btn-ghost" type="button" onClick={resetForm} disabled={saving}>
              Cancelar edição
            </button>
          ) : null}
        </div>
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
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.name}</strong>
                    </td>
                    <td>{displayOrFallback(client.email)}</td>
                    <td>{displayOrFallback(client.phone)}</td>
                    <td>
                      <span className={`badge ${client.active ? "badge-ok" : "badge-neutral"}`}>
                        {client.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => startEdit(client)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => void deactivateClient(client)}
                        >
                          Desativar
                        </button>
                      </div>
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
