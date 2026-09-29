"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import {
  formatDateBR,
  formatWorkedMinutes,
  hoursToMinutes,
  maskMinutesInput,
  minutesToHours,
  parseMinutesInput,
} from "@/lib/client/format";
import {
  labelTicketPriority,
  labelTicketStatus,
  ticketPriorityBadgeClass,
  ticketStatusBadgeClass,
} from "@/lib/client/labels";
import type { PublicContract } from "@/types/contract";
import type { PublicTicket } from "@/types/ticket";
import type { PublicTimeEntry } from "@/types/time-entry";
import styles from "../page-shared.module.css";

type TicketsPayload = { tickets: PublicTicket[] };
type ContractsPayload = { contracts: PublicContract[] };
type TimeEntriesPayload = { timeEntries: PublicTimeEntry[] };
type PanelMode = "hours" | "resolve" | "edit";

const PRIORITIES = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Crítica" },
] as const;

const WORK_STATUSES = [
  { value: "OPEN", label: "Aberto" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "WAITING", label: "Aguardando" },
] as const;

function todayInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

function sumMinutes(entries: PublicTimeEntry[]): number {
  return entries.reduce((total, entry) => total + hoursToMinutes(entry.hours), 0);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [contracts, setContracts] = useState<PublicContract[]>([]);
  const [entriesByTicket, setEntriesByTicket] = useState<Record<string, PublicTimeEntry[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelMode | null>(null);

  const [contractId, setContractId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("Suporte");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editCategory, setEditCategory] = useState("Suporte");
  const [editStatus, setEditStatus] = useState("OPEN");

  const [logHours, setLogHours] = useState("");
  const [logDate, setLogDate] = useState(todayInputValue);
  const [logNote, setLogNote] = useState("");

  const [solution, setSolution] = useState("");
  const [resolveHours, setResolveHours] = useState("");
  const [resolveDate, setResolveDate] = useState(todayInputValue);
  const [resolveNote, setResolveNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const selectedEntries = selected ? (entriesByTicket[selected.id] ?? []) : [];
  const selectedMinutes = sumMinutes(selectedEntries);

  const contractName = useMemo(() => {
    const map = new Map(contracts.map((contract) => [contract.id, `${contract.code} · ${contract.title}`]));
    return (id: string) => map.get(id) ?? "Contrato";
  }, [contracts]);

  async function loadEntries(ticketIds: string[]) {
    const pairs = await Promise.all(
      ticketIds.map(async (id) => {
        try {
          const result = await apiRequest<TimeEntriesPayload>(`/api/tickets/${id}/time-entries`);
          return [id, result.timeEntries] as const;
        } catch {
          return [id, []] as const;
        }
      }),
    );

    setEntriesByTicket(Object.fromEntries(pairs));
  }

  async function load(initial = false) {
    if (initial) {
      setLoading(true);
    }
    setError(null);

    try {
      const [ticketsResult, contractsResult] = await Promise.all([
        apiRequest<TicketsPayload>("/api/tickets"),
        apiRequest<ContractsPayload>("/api/contracts?status=ACTIVE"),
      ]);

      setTickets(ticketsResult.tickets);
      setContracts(contractsResult.contracts);
      setContractId((current) => current || contractsResult.contracts[0]?.id || "");
      await loadEntries(ticketsResult.tickets.map((ticket) => ticket.id));
    } catch (err) {
      setError(errorMessage(err, "Falha ao carregar chamados"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selected || !panel) return;
    if (!dialog.open) dialog.showModal();
  }, [selected, panel]);

  function openPanel(ticket: PublicTicket, mode: PanelMode) {
    setSelectedId(ticket.id);
    setPanel(mode);
    setError(null);
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditPriority(ticket.priority);
    setEditCategory(ticket.category);
    setEditStatus(WORK_STATUSES.some((item) => item.value === ticket.status) ? ticket.status : "IN_PROGRESS");
    setSolution(ticket.solution ?? "");
    setLogHours("");
    setLogNote("");
    setLogDate(todayInputValue());
    setResolveHours("");
    setResolveNote("");
    setResolveDate(todayInputValue());
  }

  function closePanel() {
    setSelectedId(null);
    setPanel(null);
  }

  function requestClose() {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    closePanel();
  }

  async function logTime(ticketId: string, minutesRaw: string, workedOn: string, note: string) {
    const minutes = parseMinutesInput(minutesRaw);

    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new ApiClientError("Informe o tempo gasto em minutos, por exemplo 45.", 400);
    }

    if (!workedOn) {
      throw new ApiClientError("Informe o dia em que o tempo foi gasto.", 400);
    }

    await apiRequest(`/api/tickets/${ticketId}/time-entries`, {
      method: "POST",
      body: {
        hours: minutesToHours(minutes),
        note: note.trim() || null,
        workedAt: dateInputToIso(workedOn),
      },
    });
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest("/api/tickets", {
        method: "POST",
        body: { contractId, title, description, priority, category },
      });
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setCategory("Suporte");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao abrir chamado"));
    } finally {
      setSaving(false);
    }
  }

  async function onLogHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError(null);

    try {
      await logTime(selected.id, logHours, logDate, logNote);

      if (selected.status === "OPEN") {
        await apiRequest(`/api/tickets/${selected.id}`, {
          method: "PUT",
          body: { status: "IN_PROGRESS" },
        });
      }

      setLogHours("");
      setLogNote("");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao apontar minutos"));
    } finally {
      setSaving(false);
    }
  }

  async function onResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    if (!solution.trim()) {
      setError("Descreva o que foi feito para resolver o chamado.");
      return;
    }

    const minutesRaw = resolveHours.trim();
    const alreadyLogged = selectedMinutes > 0;

    if (!minutesRaw && !alreadyLogged) {
      setError("Informe quantos minutos você gastou neste chamado. O prazo do SLA não substitui o tempo de trabalho.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (minutesRaw) {
        await logTime(selected.id, minutesRaw, resolveDate, resolveNote || "Tempo informado ao resolver");
      }

      await apiRequest(`/api/tickets/${selected.id}`, {
        method: "PUT",
        body: {
          status: "RESOLVED",
          solution: solution.trim(),
        },
      });

      requestClose();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao resolver chamado"));
    } finally {
      setSaving(false);
    }
  }

  async function onEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || selected.status === "CLOSED") return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        category: editCategory,
      };

      if (selected.status !== "RESOLVED") {
        body.status = editStatus;
      }

      await apiRequest(`/api/tickets/${selected.id}`, { method: "PUT", body });
      requestClose();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao corrigir chamado"));
    } finally {
      setSaving(false);
    }
  }

  async function closeTicket(ticket: PublicTicket) {
    if (!ticket.solution?.trim()) {
      setError("Resolva o chamado e registre a solução antes de encerrar.");
      openPanel(ticket, "resolve");
      return;
    }

    const confirmed = window.confirm(
      `Encerrar "${ticket.title}"? Depois disso não dá para apontar mais tempo nem alterar o chamado.`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest(`/api/tickets/${ticket.id}`, {
        method: "PUT",
        body: { status: "CLOSED" },
      });
      if (selectedId === ticket.id) closePanel();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao encerrar chamado"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Chamados</h1>
        </div>
      </header>

      {error && !panel ? <div className="error-banner">{error}</div> : null}

      <form className={`${styles.formPanel} panel`} onSubmit={onCreate}>
        <h2>Abrir chamado</h2>
        <div className={styles.formGrid}>
          <div className="field">
            <label htmlFor="contractId">Contrato</label>
            <select id="contractId" value={contractId} onChange={(e) => setContractId(e.target.value)} required>
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
            <input id="category" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          <div className={`field ${styles.full}`}>
            <label htmlFor="description">O que o cliente precisa</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
        </div>
        <div className={styles.formActions}>
          <button className="btn btn-primary" type="submit" disabled={saving || !contractId}>
            {saving ? "Salvando…" : "Abrir chamado"}
          </button>
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
                  <th>Tempo apontado</th>
                  <th>Prioridade</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const minutes = sumMinutes(entriesByTicket[ticket.id] ?? []);
                  const closed = ticket.status === "CLOSED";
                  const resolved = ticket.status === "RESOLVED" || closed;

                  return (
                    <tr key={ticket.id} className={selectedId === ticket.id ? styles.selectedRow : undefined}>
                      <td>
                        <strong>{ticket.title}</strong>
                        <div className="muted">{ticket.category}</div>
                        <div className="muted">{contractName(ticket.contractId)}</div>
                      </td>
                      <td>
                        <strong>{formatWorkedMinutes(minutes, true)}</strong>
                        <div className="muted">{minutes > 0 ? "tempo de trabalho" : "nenhum apontamento"}</div>
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
                        <div className={styles.actions}>
                          {!closed ? (
                            <button type="button" className={`btn btn-ghost ${styles.compact}`} onClick={() => openPanel(ticket, "hours")}>
                              Apontar tempo
                            </button>
                          ) : null}
                          {!resolved ? (
                            <button type="button" className={`btn btn-primary ${styles.compact}`} onClick={() => openPanel(ticket, "resolve")}>
                              Resolver
                            </button>
                          ) : null}
                          {ticket.status === "RESOLVED" ? (
                            <button type="button" className={`btn btn-danger ${styles.compact}`} onClick={() => void closeTicket(ticket)} disabled={saving}>
                              Encerrar
                            </button>
                          ) : null}
                          {!closed ? (
                            <button type="button" className={`btn btn-ghost ${styles.compact}`} onClick={() => openPanel(ticket, "edit")}>
                              Corrigir informações
                            </button>
                          ) : (
                            <span className="muted">Encerrado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && panel ? (
        <dialog
          ref={dialogRef}
          className={styles.dialog}
          aria-labelledby="ticket-dialog-title"
          onClose={closePanel}
          onMouseDown={(event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <div className={styles.dialogCard}>
          <div className={styles.sectionHead}>
            <div>
              <h2 id="ticket-dialog-title">
                {panel === "hours" ? "Apontar tempo" : panel === "edit" ? "Corrigir informações" : "Resolver chamado"}
              </h2>
              <p className="muted">{selected.title}</p>
            </div>
            <button type="button" className={`btn btn-ghost ${styles.compact}`} onClick={requestClose}>
              Fechar
            </button>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          {panel === "hours" ? (
            <>
              {selectedEntries.length === 0 ? (
                <p className="empty-state">Nenhum apontamento.</p>
              ) : (
                <ul className={styles.entryList}>
                  {selectedEntries.map((entry) => (
                    <li key={entry.id}>
                      <strong>{formatWorkedMinutes(entry.hours)}</strong>
                      <span>{formatDateBR(entry.workedAt)}</span>
                      <span className="muted">{entry.note?.trim() || "Sem observação"}</span>
                    </li>
                  ))}
                </ul>
              )}

              {selected.status !== "CLOSED" ? (
                <form className={styles.inlineForm} onSubmit={onLogHours}>
                  <div className="field">
                    <label htmlFor="logHours">Minutos</label>
                    <input
                      id="logHours"
                      inputMode="numeric"
                      placeholder="45 min"
                      value={logHours}
                      onChange={(e) => setLogHours(maskMinutesInput(e.target.value))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="logDate">Dia</label>
                    <input id="logDate" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
                  </div>
                  <div className={`field ${styles.noteField}`}>
                    <label htmlFor="logNote">Observação</label>
                    <input id="logNote" value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="Opcional" />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Salvando…" : "Registrar minutos"}
                  </button>
                </form>
              ) : null}
            </>
          ) : null}

          {panel === "resolve" ? (
            <form onSubmit={onResolve}>
              <div className={styles.formGrid}>
                <div className={`field ${styles.full}`}>
                  <label htmlFor="solution">Solução</label>
                  <textarea id="solution" rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="resolveHours">Minutos</label>
                  <input
                    id="resolveHours"
                    inputMode="numeric"
                    placeholder={selectedMinutes > 0 ? "Opcional" : "45 min"}
                    value={resolveHours}
                    onChange={(e) => setResolveHours(maskMinutesInput(e.target.value))}
                    required={selectedMinutes <= 0}
                  />
                </div>
                <div className="field">
                  <label htmlFor="resolveDate">Dia</label>
                  <input id="resolveDate" type="date" value={resolveDate} onChange={(e) => setResolveDate(e.target.value)} />
                </div>
                <div className={`field ${styles.full}`}>
                  <label htmlFor="resolveNote">Observação</label>
                  <input id="resolveNote" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <div className={styles.formActions}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Marcar como resolvido"}
                </button>
              </div>
            </form>
          ) : null}

          {panel === "edit" ? (
            <form onSubmit={onEdit}>
              <div className={styles.formGrid}>
                <div className="field">
                  <label htmlFor="editTitle">Título</label>
                  <input id="editTitle" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="editPriority">Prioridade</label>
                  <select id="editPriority" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                    {PRIORITIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="editCategory">Categoria</label>
                  <input id="editCategory" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} required />
                </div>
                {selected.status !== "RESOLVED" ? (
                  <div className="field">
                    <label htmlFor="editStatus">Situação</label>
                    <select id="editStatus" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      {WORK_STATUSES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className={`field ${styles.full}`}>
                  <label htmlFor="editDescription">Descrição</label>
                  <textarea id="editDescription" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required />
                </div>
              </div>
              <div className={styles.formActions}>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar dados"}
                </button>
              </div>
            </form>
          ) : null}
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
