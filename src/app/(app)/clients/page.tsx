"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { displayOrFallback } from "@/lib/client/format";
import { matchesSearch } from "@/lib/client/search";
import type { PublicClient } from "@/types/client";
import { CloseIcon, EditIcon, TrashIcon } from "../action-icons";
import styles from "../page-shared.module.css";
import { nextSortState, SortHeader, type SortDir } from "../sort-header";

type ClientsPayload = { clients: PublicClient[] };
type ClientPayload = { client: PublicClient };
type SortKey = "name" | "email" | "phone" | "status";

const SORT_DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  email: "asc",
  phone: "asc",
  status: "asc",
};

const SORT_HINT: Record<SortKey, { asc: string; desc: string }> = {
  name: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  email: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  phone: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  status: { asc: "Ordenar ativo → inativo", desc: "Ordenar inativo → ativo" },
};

export default function ClientsPage() {
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const listedClients = useMemo(() => {
    const rows = clients.filter((client) =>
      matchesSearch(search, client.name, client.email, client.phone, client.active ? "ativo" : "inativo"),
    );
    const direction = sortDir === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
          break;
        case "email":
          cmp = (a.email ?? "").localeCompare(b.email ?? "", "pt-BR", { sensitivity: "base" });
          break;
        case "phone":
          cmp = (a.phone ?? "").localeCompare(b.phone ?? "", "pt-BR", { sensitivity: "base" });
          break;
        case "status":
          cmp = Number(b.active) - Number(a.active);
          break;
        default:
          cmp = 0;
      }

      if (cmp !== 0) return cmp * direction;
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    });

    return rows;
  }, [clients, search, sortKey, sortDir]);

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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !showForm) return;
    if (!dialog.open) dialog.showModal();
  }, [showForm]);

  function toggleSort(key: SortKey) {
    const next = nextSortState(sortKey, sortDir, key, SORT_DEFAULT_DIR[key]);
    setSortKey(next.key);
    setSortDir(next.dir);
  }

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setName("");
    setEmail("");
    setPhone("");
    setFormError(null);
  }

  function requestClose() {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    resetForm();
  }

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setEmail("");
    setPhone("");
    setShowForm(true);
    setFormError(null);
  }

  function startEdit(client: PublicClient) {
    setEditingId(client.id);
    setName(client.name);
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setShowForm(true);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

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

      requestClose();
      await load();
    } catch (err) {
      setFormError(
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
        requestClose();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao desativar cliente");
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.sectionHead}>
        <div>
          <h1>Clientes</h1>
          <p className="muted">
            {loading
              ? "Carregando clientes…"
              : clients.length === 1
                ? "1 cliente ativo"
                : `${clients.length} clientes ativos`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          Novo cliente
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className={`${styles.listPanel} panel`}>
        <div className={styles.listToolbar}>
          <h2>Lista de clientes</h2>
          <div className={styles.searchField}>
            <label className="sr-only" htmlFor="client-search">
              Buscar clientes
            </label>
            <input
              id="client-search"
              type="search"
              placeholder="Buscar por nome, email ou telefone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <p className="empty-state">Carregando…</p>
        ) : clients.length === 0 ? (
          <p className="empty-state">Nenhum cliente ativo. Clique em Novo cliente para cadastrar o primeiro.</p>
        ) : listedClients.length === 0 ? (
          <p className="empty-state">Nenhum cliente corresponde à busca.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>
                    <SortHeader
                      label="Nome"
                      active={sortKey === "name"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.name}
                      hintAsc={SORT_HINT.name.asc}
                      hintDesc={SORT_HINT.name.desc}
                      alpha
                      onToggle={() => toggleSort("name")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Email"
                      active={sortKey === "email"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.email}
                      hintAsc={SORT_HINT.email.asc}
                      hintDesc={SORT_HINT.email.desc}
                      alpha
                      onToggle={() => toggleSort("email")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Telefone"
                      active={sortKey === "phone"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.phone}
                      hintAsc={SORT_HINT.phone.asc}
                      hintDesc={SORT_HINT.phone.desc}
                      onToggle={() => toggleSort("phone")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Situação"
                      active={sortKey === "status"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.status}
                      hintAsc={SORT_HINT.status.asc}
                      hintDesc={SORT_HINT.status.desc}
                      onToggle={() => toggleSort("status")}
                    />
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listedClients.map((client) => (
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
                          className={styles.iconBtn}
                          onClick={() => startEdit(client)}
                          title="Editar informações do cliente"
                          aria-label="Editar informações do cliente"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => void deactivateClient(client)}
                          title="Desativar cliente"
                          aria-label="Desativar cliente"
                        >
                          <TrashIcon />
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

      {showForm ? (
        <dialog
          ref={dialogRef}
          className={styles.dialog}
          aria-labelledby="client-dialog-title"
          onClose={resetForm}
          onMouseDown={(event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <div className={styles.dialogCard}>
            <div className={styles.sectionHead}>
              <h2 id="client-dialog-title">{editingId ? "Editar cliente" : "Novo cliente"}</h2>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={requestClose}
                disabled={saving}
                title="Fechar"
                aria-label="Fechar"
              >
                <CloseIcon />
              </button>
            </div>

            {formError ? <div className="error-banner">{formError}</div> : null}

            <form onSubmit={onSubmit}>
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
              </div>
            </form>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
