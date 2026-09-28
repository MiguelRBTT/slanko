"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import {
  labelTicketPriority,
  labelTicketStatus,
  ticketPriorityBadgeClass,
  ticketStatusBadgeClass,
} from "@/lib/client/labels";
import type { PublicContract } from "@/types/contract";
import type { PublicTicket } from "@/types/ticket";
import styles from "../page-shared.module.css";

type TicketsPayload = { tickets: PublicTicket[] };
type ContractsPayload = { contracts: PublicContract[] };

const PRIORITIES = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Crítica" },
] as const;

const STATUSES = [
  { value: "OPEN", label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "WAITING", label: "Aguardando" },
  { value: "RESOLVED", label: "Resolvido" },
  { value: "CLOSED", label: "Encerrado" },
] as const;

function isTicketClosed(status: string): boolean {
  return status === "CLOSED";
}

function canMutateTicket(status: string): boolean {
  return !isTicketClosed(status);
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [contracts, setContracts] = useState<PublicContract[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contractId, setContractId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("Suporte");
  const [status, setStatus] = useState("OPEN");
  const [solution, setSolution] = useState("");
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

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setCategory("Suporte");
    setStatus("OPEN");
    setSolution("");
    if (contracts[0]) {
      setContractId(contracts[0].id);
    }
  }

  function startEdit(ticket: PublicTicket) {
    if (!canMutateTicket(ticket.status)) {
      setError("Chamados encerrados não podem ser editados.");
      return;
    }

    setEditingId(ticket.id);
    setContractId(ticket.contractId);
    setTitle(ticket.title);
    setDescription(ticket.description);
    setPriority(ticket.priority);
    setCategory(ticket.category);
    setStatus(ticket.status);
    setSolution(ticket.solution ?? "");
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        if (
          (status === "RESOLVED" || status === "CLOSED") &&
          !solution.trim()
        ) {
          setError("Informe a solução para marcar o chamado como resolvido ou encerrado.");
          setSaving(false);
          return;
        }

        await apiRequest(`/api/tickets/${editingId}`, {
          method: "PUT",
          body: {
            title,
            description,
            priority,
            category,
            status,
            solution: solution.trim() || null,
          },
        });
      } else {
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
      }

      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : editingId
            ? "Falha ao atualizar chamado"
            : "Falha ao abrir chamado",
      );
    } finally {
      setSaving(false);
    }
  }

  async function resolveTicket(ticket: PublicTicket) {
    setError(null);

    try {
      await apiRequest(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        body: {
          status: "RESOLVED",
          solution: ticket.solution?.trim() || "Atendimento concluído pelo painel Slanko.",
        },
      });
      if (editingId === ticket.id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao resolver chamado");
    }
  }

  async function closeTicket(ticket: PublicTicket) {
    const confirmed = window.confirm(
      `Encerrar o chamado "${ticket.title}"? Ele não poderá mais ser editado.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await apiRequest(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        body: {
          status: "CLOSED",
          solution: ticket.solution?.trim() || "Chamado encerrado pelo painel Slanko.",
        },
      });
      if (editingId === ticket.id) {
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao encerrar chamado");
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Chamados</h1>
          <p className="muted">Abertura, acompanhamento, edição e encerramento com solução.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className={`${styles.formPanel} panel`} onSubmit={onSubmit}>
        <h2>{editingId ? "Editar chamado" : "Abrir chamado"}</h2>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="contractId">Contrato ativo</label>
            <select
              id="contractId"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              required
              disabled={Boolean(editingId)}
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
              {PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
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
          {editingId ? (
            <div className="field">
              <label htmlFor="status">Situação</label>
              <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
          {editingId ? (
            <div className={`field ${styles.full}`}>
              <label htmlFor="solution">Solução</label>
              <textarea
                id="solution"
                rows={2}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="Obrigatória ao resolver ou encerrar"
              />
            </div>
          ) : null}
        </div>
        <div className={styles.formActions}>
          <button className="btn btn-primary" type="submit" disabled={saving || !contractId}>
            {saving
              ? "Salvando…"
              : editingId
                ? "Salvar alterações"
                : "Abrir chamado"}
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
        ) : tickets.length === 0 ? (
          <p className="empty-state">Nenhum chamado encontrado.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Chamado</th>
                  <th>Prioridade</th>
                  <th>Situação</th>
                  <th>Ações</th>
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
                      <span className={ticketPriorityBadgeClass(ticket.priority)}>
                        {labelTicketPriority(ticket.priority)}
                      </span>
                    </td>
                    <td>
                      <span className={ticketStatusBadgeClass(ticket.status)}>
                        {labelTicketStatus(ticket.status)}
                      </span>
                    </td>
                    <td>
                      {canMutateTicket(ticket.status) ? (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => startEdit(ticket)}
                          >
                            Editar
                          </button>
                          {ticket.status !== "RESOLVED" ? (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => void resolveTicket(ticket)}
                            >
                              Resolver
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => void closeTicket(ticket)}
                          >
                            Encerrar
                          </button>
                        </div>
                      ) : (
                        <span className="muted">Encerrado</span>
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
