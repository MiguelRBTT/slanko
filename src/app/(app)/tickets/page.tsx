"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { getSession } from "@/lib/client/auth-session";
import { MAX_ATTACHMENTS_PER_TICKET } from "@/lib/attachments/rules";
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
import { matchesSearch } from "@/lib/client/search";
import {
  formatSlaDeadlineLabel,
  formatSlaDuration,
  getActiveSlaDeadline,
} from "@/lib/sla/deadline";
import type { PublicContractSummary } from "@/types/contract";
import type { PublicTicket } from "@/types/ticket";
import type { PublicTimeEntry } from "@/types/time-entry";
import type { PublicUserSummary } from "@/types/user";
import { ClockIcon, CloseIcon, EditIcon, TrashIcon } from "../action-icons";
import styles from "../page-shared.module.css";
import type { SortDir } from "../sort-header";
import cards from "./tickets.module.css";
import {
  AttachmentFileInput,
  PendingFilesList,
  TicketAttachmentGallery,
  uploadPendingFiles,
} from "./ticket-attachments";
import { TicketHistory } from "./ticket-history";

type TicketsPayload = { tickets: PublicTicket[] };
type ContractsPayload = { contracts: PublicContractSummary[] };
type TimeEntriesPayload = { timeEntries: PublicTimeEntry[] };
type UsersPayload = { users: PublicUserSummary[] };
type PanelMode = "detail" | "hours" | "resolve" | "edit" | "history";
type SortKey = "sla" | "priority" | "recent" | "time" | "title";
type StatusTab = "open" | "resolved" | "closed" | "all";

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: "open", label: "Abertos" },
  { value: "resolved", label: "Resolvidos" },
  { value: "closed", label: "Encerrados" },
  { value: "all", label: "Todos" },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "sla", label: "Prazo de SLA" },
  { value: "priority", label: "Prioridade" },
  { value: "recent", label: "Mais recentes" },
  { value: "time", label: "Tempo apontado" },
  { value: "title", label: "Título" },
];

function matchesTab(ticket: PublicTicket, tab: StatusTab): boolean {
  if (tab === "open") return ticket.status === "OPEN" || ticket.status === "IN_PROGRESS" || ticket.status === "WAITING";
  if (tab === "resolved") return ticket.status === "RESOLVED";
  if (tab === "closed") return ticket.status === "CLOSED";
  return true;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

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

const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const SORT_DEFAULT_DIR: Record<SortKey, SortDir> = {
  sla: "asc",
  priority: "asc",
  recent: "desc",
  time: "desc",
  title: "asc",
};

function todayInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T12:00:00`).toISOString();
}

function isoToDateInput(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/** Painel de detalhe: tudo sobre o chamado e as ações possíveis na situação atual. */
function TicketDetail({
  ticket,
  minutes,
  now,
  saving,
  userName,
  onOpen,
  onClose,
  onDelete,
}: {
  ticket: PublicTicket;
  minutes: number;
  now: Date;
  saving: boolean;
  userName: (id: string | null | undefined) => string;
  onOpen: (mode: PanelMode) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const closed = ticket.status === "CLOSED";
  const resolved = ticket.status === "RESOLVED" || closed;
  const deadline = getActiveSlaDeadline({
    openedAt: ticket.openedAt,
    firstResponseAt: ticket.firstResponseAt,
    resolvedAt: ticket.resolvedAt,
    status: ticket.status,
    responseMinutes: ticket.responseMinutes,
    resolutionMinutes: ticket.resolutionMinutes,
    now,
  });
  const observers = ticket.observerIds.map((id) => userName(id));

  return (
    <>
      <div className={cards.detailBadges}>
        <span className={ticketStatusBadgeClass(ticket.status)}>{labelTicketStatus(ticket.status)}</span>
        <span className={ticketPriorityBadgeClass(ticket.priority)}>
          Prioridade {labelTicketPriority(ticket.priority).toLowerCase()}
        </span>
        {deadline ? (
          <span
            className={`${styles.slaClock} ${
              deadline.tone === "breached" ? styles.slaBreached : deadline.tone === "warn" ? styles.slaWarn : styles.slaOk
            }`}
          >
            <ClockIcon />
            <span>{formatSlaDeadlineLabel(deadline)}</span>
          </span>
        ) : null}
      </div>

      <div className={cards.detailActions}>
        {!resolved ? (
          <button type="button" className={`btn btn-primary ${styles.compact}`} onClick={() => onOpen("resolve")}>
            Resolver
          </button>
        ) : null}
        {ticket.status === "RESOLVED" ? (
          <button type="button" className={`btn btn-primary ${styles.compact}`} onClick={onClose} disabled={saving}>
            Encerrar
          </button>
        ) : null}
        {!closed ? (
          <button type="button" className={`btn btn-ghost ${styles.compact}`} onClick={() => onOpen("hours")}>
            Apontar tempo
          </button>
        ) : null}
        {!closed ? (
          <button type="button" className={`btn btn-ghost ${styles.compact}`} onClick={() => onOpen("edit")}>
            <EditIcon />
            Editar
          </button>
        ) : null}
        <button type="button" className={`btn btn-ghost ${styles.compact}`} onClick={() => onOpen("history")}>
          Histórico
        </button>
        {!resolved && minutes === 0 ? (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger} ${cards.push}`}
            onClick={onDelete}
            disabled={saving}
            title="Excluir chamado aberto por engano (sem tempo apontado)"
            aria-label="Excluir chamado"
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>

      <dl className={cards.facts}>
        <div>
          <dt>Responsável</dt>
          <dd>{ticket.assignedToId ? (ticket.assignedToName ?? userName(ticket.assignedToId)) : "Sem responsável"}</dd>
        </div>
        <div>
          <dt>Observadores</dt>
          <dd>{observers.length > 0 ? observers.join(", ") : "Nenhum"}</dd>
        </div>
        <div>
          <dt>Categoria</dt>
          <dd>{ticket.category}</dd>
        </div>
        <div>
          <dt>Aberto em</dt>
          <dd>{formatDateBR(ticket.openedAt)}</dd>
        </div>
        <div>
          <dt>Tempo apontado</dt>
          <dd>{formatWorkedMinutes(minutes, true)}</dd>
        </div>
        <div>
          <dt>Metas de SLA</dt>
          <dd>
            Resposta em {formatSlaDuration(ticket.responseMinutes)}, resolução em{" "}
            {formatSlaDuration(ticket.resolutionMinutes)}
          </dd>
        </div>
      </dl>

      <div className={cards.textBlock}>
        <h3>Descrição</h3>
        <p>{ticket.description}</p>
      </div>

      {ticket.solution ? (
        <div className={cards.textBlock}>
          <h3>Solução</h3>
          <p>{ticket.solution}</p>
        </div>
      ) : null}

      <TicketAttachmentGallery ticketId={ticket.id} canEdit={false} onError={() => undefined} />
    </>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<PublicTicket[]>([]);
  const [contracts, setContracts] = useState<PublicContractSummary[]>([]);
  const [technicians, setTechnicians] = useState<PublicUserSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [entriesByTicket, setEntriesByTicket] = useState<Record<string, PublicTimeEntry[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelMode | null>(null);

  const [contractId, setContractId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("Suporte");
  const [assignedToId, setAssignedToId] = useState("");
  const [observerIds, setObserverIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editCategory, setEditCategory] = useState("Suporte");
  const [editStatus, setEditStatus] = useState("OPEN");
  const [editAssignedToId, setEditAssignedToId] = useState("");
  const [editObserverIds, setEditObserverIds] = useState<string[]>([]);

  const [logHours, setLogHours] = useState("");
  const [logDate, setLogDate] = useState(todayInputValue);
  const [logNote, setLogNote] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [solution, setSolution] = useState("");
  const [resolveHours, setResolveHours] = useState("");
  const [resolveDate, setResolveDate] = useState(todayInputValue);
  const [resolveNote, setResolveNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [sortKey, setSortKey] = useState<SortKey>("sla");
  const [statusTab, setStatusTab] = useState<StatusTab>("open");
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const createDialogRef = useRef<HTMLDialogElement>(null);

  const isGestor = currentUser?.role === "GESTOR";
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;
  const selectedEntries = selected ? (entriesByTicket[selected.id] ?? []) : [];
  const selectedEntriesLoaded = selected ? selected.id in entriesByTicket : false;
  // Total vem agregado na listagem; os apontamentos só são buscados para o chamado aberto.
  const selectedMinutes = selected ? hoursToMinutes(selected.loggedHours) : 0;

  const activeContracts = useMemo(
    () => contracts.filter((contract) => contract.status === "ACTIVE"),
    [contracts],
  );

  const contractById = useMemo(() => {
    const map = new Map(contracts.map((contract) => [contract.id, contract]));
    return map;
  }, [contracts]);

  const openTicketsCount = useMemo(
    () =>
      tickets.filter(
        (ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS" || ticket.status === "WAITING",
      ).length,
    [tickets],
  );

  const slaRemainingMinutes = useMemo(() => {
    return (ticket: PublicTicket): number | null => {
      const deadline = getActiveSlaDeadline({
        openedAt: ticket.openedAt,
        firstResponseAt: ticket.firstResponseAt,
        resolvedAt: ticket.resolvedAt,
        status: ticket.status,
        responseMinutes: ticket.responseMinutes,
        resolutionMinutes: ticket.resolutionMinutes,
        now,
      });

      return deadline ? deadline.remainingMinutes : null;
    };
  }, [now]);

  const contractName = useMemo(() => {
    return (id: string) => {
      const contract = contractById.get(id);
      return contract ? `${contract.code}: ${contract.title}` : "Contrato";
    };
  }, [contractById]);

  const tabCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = { open: 0, resolved: 0, closed: 0, all: tickets.length };
    for (const ticket of tickets) {
      if (matchesTab(ticket, "open")) counts.open += 1;
      if (ticket.status === "RESOLVED") counts.resolved += 1;
      if (ticket.status === "CLOSED") counts.closed += 1;
    }
    return counts;
  }, [tickets]);

  const listedTickets = useMemo(() => {
    const rows = tickets.filter((ticket) => {
      if (!matchesTab(ticket, statusTab)) return false;
      const contract = contractById.get(ticket.contractId);
      return matchesSearch(
        search,
        ticket.title,
        ticket.category,
        ticket.description,
        labelTicketPriority(ticket.priority),
        labelTicketStatus(ticket.status),
        contract?.code,
        contract?.title,
      );
    });
    const direction = SORT_DEFAULT_DIR[sortKey] === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "title":
          cmp = a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
          break;
        case "recent":
          cmp = new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
          break;
        case "sla": {
          const remainingA = slaRemainingMinutes(a);
          const remainingB = slaRemainingMinutes(b);
          const valueA = remainingA ?? Number.POSITIVE_INFINITY;
          const valueB = remainingB ?? Number.POSITIVE_INFINITY;
          cmp = valueA - valueB;
          break;
        }
        case "time":
          cmp = hoursToMinutes(a.loggedHours) - hoursToMinutes(b.loggedHours);
          break;
        case "priority":
          cmp = (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99);
          break;
        default:
          cmp = 0;
      }

      if (cmp !== 0) return cmp * direction;
      return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
    });

    return rows;
  }, [tickets, search, sortKey, statusTab, slaRemainingMinutes, contractById]);

  async function loadEntries(ticketId: string) {
    try {
      const result = await apiRequest<TimeEntriesPayload>(`/api/tickets/${ticketId}/time-entries`);
      setEntriesByTicket((current) => ({ ...current, [ticketId]: result.timeEntries }));
    } catch (err) {
      setError(errorMessage(err, "Falha ao carregar apontamentos"));
    }
  }

  async function load(initial = false) {
    if (initial) {
      setLoading(true);
    }
    setError(null);

    try {
      const [ticketsResult, contractsResult, usersResult] = await Promise.all([
        apiRequest<TicketsPayload>("/api/tickets"),
        apiRequest<ContractsPayload>("/api/contracts"),
        apiRequest<UsersPayload>("/api/users"),
      ]);

      const active = contractsResult.contracts.filter((contract) => contract.status === "ACTIVE");
      setTickets(ticketsResult.tickets);
      setContracts(contractsResult.contracts);
      setTechnicians(usersResult.users.filter((user) => user.role === "TECNICO" && user.active));
      setContractId((current) => current || active[0]?.id || "");
      if (selectedId) {
        await loadEntries(selectedId);
      }
    } catch (err) {
      setError(errorMessage(err, "Falha ao carregar chamados"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const sessionUser = getSession()?.user;
    setCurrentUser(sessionUser ? { id: sessionUser.id, role: sessionUser.role } : null);
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleObserver(userId: string, checked: boolean, mode: "create" | "edit") {
    if (mode === "create") {
      setObserverIds((current) =>
        checked ? [...current, userId] : current.filter((id) => id !== userId),
      );
      return;
    }

    setEditObserverIds((current) =>
      checked ? [...current, userId] : current.filter((id) => id !== userId),
    );
  }

  function userName(userId: string | null | undefined): string {
    if (!userId) return "Sem responsável";
    return technicians.find((user) => user.id === userId)?.name ?? "Técnico";
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selected || !panel) return;
    if (!dialog.open) dialog.showModal();
  }, [selected, panel]);

  useEffect(() => {
    const dialog = createDialogRef.current;
    if (!dialog || !showCreateForm) return;
    if (!dialog.open) dialog.showModal();
  }, [showCreateForm]);

  function openPanel(ticket: PublicTicket, mode: PanelMode) {
    setSelectedId(ticket.id);
    void loadEntries(ticket.id);
    setPanel(mode);
    setError(null);
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditPriority(ticket.priority);
    setEditCategory(ticket.category);
    setEditStatus(WORK_STATUSES.some((item) => item.value === ticket.status) ? ticket.status : "IN_PROGRESS");
    setEditAssignedToId(ticket.assignedToId ?? "");
    setEditObserverIds(ticket.observerIds ?? []);
    setSolution(ticket.solution ?? "");
    setLogHours("");
    setLogNote("");
    setLogDate(todayInputValue());
    setEditingEntryId(null);
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

  function resetCreateForm() {
    setShowCreateForm(false);
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setCategory("Suporte");
    setAssignedToId("");
    setObserverIds([]);
    setPendingFiles([]);
    setError(null);
  }

  function openCreateForm() {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setCategory("Suporte");
    setAssignedToId("");
    setObserverIds([]);
    setPendingFiles([]);
    setShowCreateForm(true);
    setError(null);
  }

  function requestCloseCreate() {
    const dialog = createDialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    resetCreateForm();
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = await apiRequest<{ ticket: PublicTicket }>("/api/tickets", {
        method: "POST",
        body: {
          contractId,
          title,
          description,
          priority,
          category,
          assignedToId: assignedToId || null,
          observerIds: isGestor ? observerIds.filter((id) => id !== assignedToId) : [],
        },
      });

      if (pendingFiles.length > 0) {
        await uploadPendingFiles(created.ticket.id, pendingFiles);
      }

      requestCloseCreate();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao abrir chamado"));
    } finally {
      setSaving(false);
    }
  }

  function canChangeEntry(entry: PublicTimeEntry): boolean {
    return Boolean(currentUser) && (isGestor || entry.userId === currentUser?.id);
  }

  function startEditEntry(entry: PublicTimeEntry) {
    setEditingEntryId(entry.id);
    setLogHours(maskMinutesInput(String(hoursToMinutes(entry.hours))));
    setLogDate(isoToDateInput(entry.workedAt));
    setLogNote(entry.note ?? "");
    setError(null);
  }

  function cancelEditEntry() {
    setEditingEntryId(null);
    setLogHours("");
    setLogNote("");
    setLogDate(todayInputValue());
  }

  async function deleteEntry(entry: PublicTimeEntry) {
    if (!selected) return;

    const confirmed = window.confirm(
      `Excluir o apontamento de ${formatWorkedMinutes(entry.hours)}? A exclusão fica registrada no histórico do chamado.`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest(`/api/tickets/${selected.id}/time-entries/${entry.id}`, { method: "DELETE" });
      if (editingEntryId === entry.id) cancelEditEntry();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao excluir apontamento"));
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
      if (editingEntryId) {
        const minutes = parseMinutesInput(logHours);

        if (!Number.isInteger(minutes) || minutes <= 0) {
          throw new ApiClientError("Informe o tempo gasto em minutos, por exemplo 45.", 400);
        }

        await apiRequest(`/api/tickets/${selected.id}/time-entries/${editingEntryId}`, {
          method: "PUT",
          body: {
            hours: minutesToHours(minutes),
            note: logNote.trim() || null,
            workedAt: dateInputToIso(logDate),
          },
        });

        cancelEditEntry();
        await load();
        return;
      }

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

      setPanel("detail");
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
      const body: Record<string, unknown> = {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        category: editCategory,
      };

      if (selected.status !== "RESOLVED") {
        body.status = editStatus;
      }

      if (isGestor) {
        body.assignedToId = editAssignedToId || null;
        body.observerIds = editObserverIds.filter((id) => id !== editAssignedToId);
      } else if (!selected.assignedToId && currentUser && editAssignedToId === currentUser.id) {
        body.assignedToId = currentUser.id;
      }

      await apiRequest(`/api/tickets/${selected.id}`, { method: "PUT", body });
      setPanel("detail");
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
      if (selectedId === ticket.id) setPanel("detail");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao encerrar chamado"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTicket(ticket: PublicTicket) {
    const confirmed = window.confirm(
      `Excluir o chamado "${ticket.title}"? Use só para chamados abertos por engano: a exclusão não pode ser desfeita.`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await apiRequest(`/api/tickets/${ticket.id}`, { method: "DELETE" });
      if (selectedId === ticket.id) closePanel();
      await load();
    } catch (err) {
      setError(errorMessage(err, "Falha ao excluir chamado"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.sectionHead}>
        <div>
          <h1>Chamados</h1>
          <p className="muted">
            {loading
              ? "Carregando chamados…"
              : openTicketsCount === 1
                ? "1 chamado em andamento"
                : `${openTicketsCount} chamados em andamento`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          Novo chamado
        </button>
      </header>

      {error && !panel && !showCreateForm ? <div className="error-banner">{error}</div> : null}

      <div className={cards.toolbar}>
        <div className={cards.tabs} role="group" aria-label="Situação dos chamados">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${cards.tab} ${statusTab === tab.value ? cards.tabActive : ""}`}
              aria-pressed={statusTab === tab.value}
              onClick={() => setStatusTab(tab.value)}
            >
              {tab.label}
              <span className={cards.tabCount}>{tabCounts[tab.value]}</span>
            </button>
          ))}
        </div>
        <div className={`${styles.searchField} ${cards.search}`}>
          <label className="sr-only" htmlFor="ticket-search">
            Buscar chamados
          </label>
          <input
            id="ticket-search"
            type="search"
            placeholder="Buscar por título, categoria ou contrato…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className={`field ${cards.sort}`}>
          <span>Ordenar por</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className={cards.empty}>Carregando chamados…</p>
      ) : tickets.length === 0 ? (
        <p className={cards.empty}>Nenhum chamado ainda. Clique em Novo chamado para abrir o primeiro.</p>
      ) : listedTickets.length === 0 ? (
        <p className={cards.empty}>
          {search ? "Nenhum chamado corresponde à busca." : "Nenhum chamado nesta situação."}
        </p>
      ) : (
        <ul className={cards.grid}>
          {listedTickets.map((ticket) => {
            const minutes = hoursToMinutes(ticket.loggedHours);
            const deadline = getActiveSlaDeadline({
              openedAt: ticket.openedAt,
              firstResponseAt: ticket.firstResponseAt,
              resolvedAt: ticket.resolvedAt,
              status: ticket.status,
              responseMinutes: ticket.responseMinutes,
              resolutionMinutes: ticket.resolutionMinutes,
              now,
            });
            const toneClass =
              deadline?.tone === "breached" ? cards.cardBreached : deadline?.tone === "warn" ? cards.cardWarn : "";
            const slaToneClass =
              deadline?.tone === "breached"
                ? styles.slaBreached
                : deadline?.tone === "warn"
                  ? styles.slaWarn
                  : styles.slaOk;
            const assignee = ticket.assignedToId ? (ticket.assignedToName ?? userName(ticket.assignedToId)) : null;

            return (
              <li key={ticket.id}>
                <button
                  type="button"
                  className={[
                    cards.card,
                    toneClass,
                    selectedId === ticket.id ? cards.cardSelected : "",
                    ticket.status === "CLOSED" ? cards.cardClosed : "",
                  ].join(" ")}
                  onClick={() => openPanel(ticket, "detail")}
                >
                  <span className={cards.cardTop}>
                    <span className={ticketStatusBadgeClass(ticket.status)}>{labelTicketStatus(ticket.status)}</span>
                    {deadline ? (
                      <span className={`${styles.slaClock} ${slaToneClass}`} title={formatSlaDeadlineLabel(deadline)}>
                        <ClockIcon />
                        <span>
                          {deadline.remainingMinutes <= 0 ? "Estourado" : formatSlaDuration(deadline.remainingMinutes)}
                        </span>
                      </span>
                    ) : null}
                  </span>
                  <span className={cards.cardTitle}>{ticket.title}</span>
                  <span className={cards.cardContract}>{contractName(ticket.contractId)}</span>
                  <span className={cards.cardFoot}>
                    <span className={cards.person}>
                      <span className={ticketPriorityBadgeClass(ticket.priority)}>
                        {labelTicketPriority(ticket.priority)}
                      </span>
                      {assignee ? (
                        <>
                          <span className={cards.avatar} aria-hidden="true">
                            {initials(assignee)}
                          </span>
                          <span>{assignee}</span>
                        </>
                      ) : (
                        <span>Sem responsável</span>
                      )}
                    </span>
                    <span className={`${cards.time} ${minutes === 0 ? cards.timeEmpty : ""}`}>
                      {minutes > 0 ? formatWorkedMinutes(minutes, true) : "0 min"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showCreateForm ? (
        <dialog
          ref={createDialogRef}
          className={styles.dialog}
          aria-labelledby="create-ticket-dialog-title"
          onClose={resetCreateForm}
          onMouseDown={(event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) requestCloseCreate();
          }}
        >
          <div className={styles.dialogCard}>
            <div className={styles.sectionHead}>
              <h2 id="create-ticket-dialog-title">Novo chamado</h2>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={requestCloseCreate}
                disabled={saving}
                title="Fechar"
                aria-label="Fechar"
              >
                <CloseIcon />
              </button>
            </div>

            {error ? <div className="error-banner">{error}</div> : null}

            <form onSubmit={onCreate}>
              <div className={styles.formGrid}>
                {isGestor ? (
                  <div className="field">
                    <label htmlFor="assignedToId">Responsável</label>
                    <select id="assignedToId" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
                      <option value="">Sem responsável</option>
                      {technicians.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <label className={`field ${styles.checkboxItem}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(currentUser) && assignedToId === currentUser?.id}
                      onChange={(e) => setAssignedToId(e.target.checked && currentUser ? currentUser.id : "")}
                    />
                    <span>Assumir este chamado</span>
                  </label>
                )}
                <div className="field">
                  <label htmlFor="contractId">Contrato</label>
                  <select id="contractId" value={contractId} onChange={(e) => setContractId(e.target.value)} required>
                    <option value="" disabled>
                      Selecione
                    </option>
                    {activeContracts.map((contract) => (
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
                {isGestor ? (
                <div className={`field ${styles.full}`}>
                  <span className={styles.checkboxLegend}>Observadores</span>
                  <div className={styles.checkboxList}>
                    {technicians.length === 0 ? (
                      <p className="muted">Nenhum técnico cadastrado.</p>
                    ) : (
                      technicians
                        .filter((user) => user.id !== assignedToId)
                        .map((user) => (
                          <label key={user.id} className={styles.checkboxItem}>
                            <input
                              type="checkbox"
                              checked={observerIds.includes(user.id)}
                              onChange={(e) => toggleObserver(user.id, e.target.checked, "create")}
                            />
                            <span>{user.name}</span>
                          </label>
                        ))
                    )}
                  </div>
                </div>
                ) : null}
                <div className={`field ${styles.full}`}>
                  <label htmlFor="description">O que o cliente precisa</label>
                  <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <div className={styles.full}>
                  <AttachmentFileInput
                    id="createAttachments"
                    disabled={saving}
                    remainingSlots={MAX_ATTACHMENTS_PER_TICKET - pendingFiles.length}
                    onAdd={(files) => setPendingFiles((current) => [...current, ...files])}
                    onError={setError}
                  />
                  <PendingFilesList
                    files={pendingFiles}
                    onRemove={(index) =>
                      setPendingFiles((current) => current.filter((_, i) => i !== index))
                    }
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button className="btn btn-primary" type="submit" disabled={saving || !contractId}>
                  {saving ? "Salvando…" : "Abrir chamado"}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      ) : null}

      {selected && panel ? (
        <dialog
          ref={dialogRef}
          className={`${styles.dialog} ${styles.dialogWide}`}
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
                {panel === "detail"
                  ? selected.title
                  : panel === "hours"
                    ? "Apontar tempo"
                    : panel === "edit"
                      ? "Editar chamado"
                      : panel === "history"
                        ? "Histórico do chamado"
                        : "Resolver chamado"}
              </h2>
              <p className="muted">{panel === "detail" ? contractName(selected.contractId) : selected.title}</p>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={requestClose}
              title="Fechar"
              aria-label="Fechar"
            >
              <CloseIcon />
            </button>
          </div>

          {panel !== "detail" ? (
            <button type="button" className={cards.back} onClick={() => setPanel("detail")}>
              Voltar ao chamado
            </button>
          ) : null}

          {error ? <div className="error-banner">{error}</div> : null}

          {panel === "detail" ? (
            <TicketDetail
              ticket={selected}
              minutes={selectedMinutes}
              now={now}
              saving={saving}
              userName={userName}
              onOpen={(mode) => setPanel(mode)}
              onClose={() => void closeTicket(selected)}
              onDelete={() => void deleteTicket(selected)}
            />
          ) : null}

          {panel === "hours" ? (
            <>
              {!selectedEntriesLoaded ? (
                <p className="muted">Carregando apontamentos…</p>
              ) : selectedEntries.length === 0 ? (
                <p className="empty-state">Nenhum tempo apontado ainda.</p>
              ) : (
                <ul className={styles.entryList}>
                  {selectedEntries.map((entry) => (
                    <li key={entry.id} className={editingEntryId === entry.id ? styles.selectedRow : undefined}>
                      <strong>{formatWorkedMinutes(entry.hours)}</strong>
                      <span>{formatDateBR(entry.workedAt)}</span>
                      <span className="muted">{entry.note?.trim() || "Sem observação"}</span>
                      {selected.status !== "CLOSED" && canChangeEntry(entry) ? (
                        <span className={styles.actions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => startEditEntry(entry)}
                            disabled={saving}
                            title="Corrigir apontamento"
                            aria-label="Corrigir apontamento"
                          >
                            <EditIcon />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => void deleteEntry(entry)}
                            disabled={saving}
                            title="Excluir apontamento"
                            aria-label="Excluir apontamento"
                          >
                            <TrashIcon />
                          </button>
                        </span>
                      ) : null}
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
                    {saving ? "Salvando…" : editingEntryId ? "Salvar correção" : "Registrar minutos"}
                  </button>
                  {editingEntryId ? (
                    <button className="btn btn-ghost" type="button" onClick={cancelEditEntry} disabled={saving}>
                      Cancelar
                    </button>
                  ) : null}
                </form>
              ) : null}

              <TicketAttachmentGallery ticketId={selected.id} canEdit={false} onError={setError} />
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
              <TicketAttachmentGallery ticketId={selected.id} canEdit={false} onError={setError} />
            </form>
          ) : null}

          {panel === "history" ? (
            <>
              <dl className={styles.ticketSummary}>
                <div>
                  <dt>Situação</dt>
                  <dd>{labelTicketStatus(selected.status)}</dd>
                </div>
                <div>
                  <dt>Aberto em</dt>
                  <dd>{formatDateBR(selected.openedAt)}</dd>
                </div>
                <div>
                  <dt>Tempo apontado</dt>
                  <dd>{formatWorkedMinutes(selectedMinutes, true)}</dd>
                </div>
                {selected.solution ? (
                  <div className={styles.full}>
                    <dt>Solução</dt>
                    <dd>{selected.solution}</dd>
                  </div>
                ) : null}
              </dl>
              <TicketHistory ticketId={selected.id} userName={userName} />
              <TicketAttachmentGallery ticketId={selected.id} canEdit={false} onError={setError} />
            </>
          ) : null}

          {panel === "edit" ? (
            <form onSubmit={onEdit}>
              <div className={styles.formGrid}>
                {isGestor ? (
                  <div className="field">
                    <label htmlFor="editAssignedToId">Responsável</label>
                    <select
                      id="editAssignedToId"
                      value={editAssignedToId}
                      onChange={(e) => setEditAssignedToId(e.target.value)}
                    >
                      <option value="">Sem responsável</option>
                      {technicians.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : selected.assignedToId ? (
                  <div className="field">
                    <span className={styles.checkboxLegend}>Responsável</span>
                    <p>{selected.assignedToName ?? userName(selected.assignedToId)}</p>
                  </div>
                ) : (
                  <label className={`field ${styles.checkboxItem}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(currentUser) && editAssignedToId === currentUser?.id}
                      onChange={(e) => setEditAssignedToId(e.target.checked && currentUser ? currentUser.id : "")}
                    />
                    <span>Assumir este chamado</span>
                  </label>
                )}
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
                {isGestor ? (
                <div className={`field ${styles.full}`}>
                  <span className={styles.checkboxLegend}>Observadores</span>
                  <div className={styles.checkboxList}>
                    {technicians
                      .filter((user) => user.id !== editAssignedToId)
                      .map((user) => (
                        <label key={user.id} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={editObserverIds.includes(user.id)}
                            onChange={(e) => toggleObserver(user.id, e.target.checked, "edit")}
                          />
                          <span>{user.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
                ) : null}
                <div className={`field ${styles.full}`}>
                  <label htmlFor="editDescription">Descrição</label>
                  <textarea id="editDescription" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required />
                </div>
                <div className={styles.full}>
                  <TicketAttachmentGallery
                    ticketId={selected.id}
                    canEdit={selected.status !== "CLOSED"}
                    onError={setError}
                  />
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
