"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { PublicContract } from "@/types/contract";
import type { PublicTicket } from "@/types/ticket";
import styles from "../page-shared.module.css";

type TicketsPayload = { tickets: PublicTicket[] };
type ContractsPayload = { contracts: PublicContract[] };

export default function TicketsPage() {
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [contracts, setContracts] = useState<PublicContract[]>([]);
  const [contractId, setContractId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("Suporte");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [ticketsResult, contractsResult] = await Promise.all([
        apiRequest<TicketsPayload>("/api/tickets"),
        apiRequest<ContractsPayload>("/api/contracts?status=ACTIVE"),
      ]);

      setTickets(ticketsResult.tickets);
      setContracts(contractsResult.contracts);

      if (!contractId && contractsResult.contracts[0]) {
        setContractId(contractsResult.contracts[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao carregar chamados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest("/api/tickets", {
        method: "POST",
        body: {
          contractId,
          title,
          description,
          priority,
          category,
        },
      });
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao abrir chamado");
    } finally {
      setSaving(false);
    }
  }

  async function resolveTicket(ticketId: string) {
    setError(null);

    try {
      await apiRequest(`/api/tickets/${ticketId}`, {
        method: "PUT",
        body: {
          status: "RESOLVED",
          solution: "Atendimento concluído via painel Slanko.",
        },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao resolver chamado");
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Chamados</h1>
          <p className="muted">Abertura, acompanhamento e encerramento com solução.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className={`${styles.formPanel} panel`} onSubmit={onCreate}>
        <h2>Abrir chamado</h2>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="contractId">Contrato ativo</label>
            <select
              id="contractId"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              required
            >
              <option value="" disabled>
                Selecione
              </option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.code}: {contract.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="title">Título</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="priority">Prioridade</label>
            <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="category">Categoria</label>
            <input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>
          <div className={`field ${styles.full}`}>
            <label htmlFor="description">Descrição</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving || !contractId}>
          {saving ? "Abrindo…" : "Abrir chamado"}
        </button>
      </form>

      <section className={`${styles.listPanel} panel`}>
        {loading ? (
          <p className="empty-state">Carregando…</p>
        ) : tickets.length === 0 ? (
          <p className="empty-state">Nenhum chamado encontrado.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Chamado</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.title}</strong>
                      <div className="muted">{ticket.category}</div>
                    </td>
                    <td>
                      <span className="badge badge-warn">{ticket.priority}</span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{ticket.status}</span>
                    </td>
                    <td>
                      {ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => void resolveTicket(ticket.id)}
                        >
                          Resolver
                        </button>
                      ) : (
                        <span className="muted">n/d</span>
                      )}
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
