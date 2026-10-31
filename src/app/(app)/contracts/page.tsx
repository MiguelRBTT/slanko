"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { formatMoneyBRL, maskMoneyInput, parseMoneyInput } from "@/lib/client/format";
import {
  contractStatusBadgeClass,
  labelContractStatus,
} from "@/lib/client/labels";
import { matchesSearch } from "@/lib/client/search";
import type { PublicClient } from "@/types/client";
import type { PublicContract } from "@/types/contract";
import { CloseIcon, EditIcon, TrashIcon } from "../action-icons";
import styles from "../page-shared.module.css";
import { nextSortState, SortHeader, type SortDir } from "../sort-header";

type ClientsPayload = { clients: PublicClient[] };
type ContractsPayload = { contracts: PublicContract[] };
type SortKey = "client" | "code" | "title" | "value" | "sla" | "status";

const CONTRACT_STATUSES = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "SUSPENDED", label: "Suspenso" },
  { value: "FINISHED", label: "Finalizado" },
] as const;

const CONTRACT_STATUS_RANK: Record<string, number> = {
  ACTIVE: 0,
  DRAFT: 1,
  SUSPENDED: 2,
  FINISHED: 3,
};

const SORT_DEFAULT_DIR: Record<SortKey, SortDir> = {
  client: "asc",
  code: "asc",
  title: "asc",
  value: "desc",
  sla: "asc",
  status: "asc",
};

const SORT_HINT: Record<SortKey, { asc: string; desc: string }> = {
  client: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  code: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  title: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  value: { asc: "Ordenar menor → maior valor", desc: "Ordenar maior → menor valor" },
  sla: { asc: "Ordenar prazo mais curto → mais longo", desc: "Ordenar prazo mais longo → mais curto" },
  status: { asc: "Ordenar ativo → finalizado", desc: "Ordenar finalizado → ativo" },
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<PublicContract[]>([]);
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState(formatMoneyBRL(4500));
  const [startDate, setStartDate] = useState("2026-01-01");
  const [status, setStatus] = useState("ACTIVE");
  const [responseMinutes, setResponseMinutes] = useState("60");
  const [resolutionMinutes, setResolutionMinutes] = useState("480");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("client");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const clientNameById = useMemo(() => {
    const map = new Map(clients.map((client) => [client.id, client.name]));
    return map;
  }, [clients]);

  const clientName = useCallback((id: string) => clientNameById.get(id) ?? "Cliente", [clientNameById]);

  const listedContracts = useMemo(() => {
    const rows = contracts.filter((contract) =>
      matchesSearch(
        search,
        contract.code,
        contract.title,
        clientNameById.get(contract.clientId),
        labelContractStatus(contract.status),
      ),
    );
    const direction = sortDir === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "client":
          cmp = clientName(a.clientId).localeCompare(clientName(b.clientId), "pt-BR", {
            sensitivity: "base",
          });
          break;
        case "code":
          cmp = a.code.localeCompare(b.code, "pt-BR", { sensitivity: "base" });
          break;
        case "title":
          cmp = a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
          break;
        case "value":
          cmp = Number(a.value) - Number(b.value);
          break;
        case "sla":
          cmp =
            a.responseMinutes + a.resolutionMinutes - (b.responseMinutes + b.resolutionMinutes);
          break;
        case "status":
          cmp = (CONTRACT_STATUS_RANK[a.status] ?? 99) - (CONTRACT_STATUS_RANK[b.status] ?? 99);
          break;
        default:
          cmp = 0;
      }

      if (cmp !== 0) return cmp * direction;
      return a.code.localeCompare(b.code, "pt-BR", { sensitivity: "base" });
    });

    return rows;
  }, [contracts, search, sortKey, sortDir, clientNameById, clientName]);

  function toggleSort(key: SortKey) {
    const next = nextSortState(sortKey, sortDir, key, SORT_DEFAULT_DIR[key]);
    setSortKey(next.key);
    setSortDir(next.dir);
  }

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [contractsResult, clientsResult] = await Promise.all([
        apiRequest<ContractsPayload>("/api/contracts"),
        apiRequest<ClientsPayload>("/api/clients"),
      ]);
      setContracts(contractsResult.contracts);
      setClients(clientsResult.clients);
      if (!clientId && clientsResult.clients[0]) {
        setClientId(clientsResult.clients[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao carregar contratos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !showForm) return;
    if (!dialog.open) dialog.showModal();
  }, [showForm]);

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setCode("");
    setTitle("");
    setValue(formatMoneyBRL(4500));
    setStartDate("2026-01-01");
    setStatus("ACTIVE");
    setResponseMinutes("60");
    setResolutionMinutes("480");
    if (clients[0]) {
      setClientId(clients[0].id);
    }
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
    setCode("");
    setTitle("");
    setValue(formatMoneyBRL(4500));
    setStartDate("2026-01-01");
    setStatus("ACTIVE");
    setResponseMinutes("60");
    setResolutionMinutes("480");
    if (clients[0]) {
      setClientId(clients[0].id);
    }
    setShowForm(true);
    setFormError(null);
  }

  function startEdit(contract: PublicContract) {
    setEditingId(contract.id);
    setClientId(contract.clientId);
    setCode(contract.code);
    setTitle(contract.title);
    setValue(formatMoneyBRL(contract.value));
    setStartDate(contract.startDate);
    setStatus(contract.status);
    setResponseMinutes(String(contract.responseMinutes));
    setResolutionMinutes(String(contract.resolutionMinutes));
    setShowForm(true);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const parsedValue = parseMoneyInput(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setFormError("Informe um valor válido em reais (ex.: 10.000,00).");
      setSaving(false);
      return;
    }

    const payload = {
      clientId,
      code,
      title,
      value: parsedValue,
      startDate,
      status,
      responseMinutes: Number(responseMinutes),
      resolutionMinutes: Number(resolutionMinutes),
    };

    try {
      if (editingId) {
        await apiRequest(`/api/contracts/${editingId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await apiRequest("/api/contracts", {
          method: "POST",
          body: payload,
        });
      }

      requestClose();
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : editingId
            ? "Falha ao atualizar contrato"
            : "Falha ao criar contrato",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeContract(contract: PublicContract) {
    const confirmed = window.confirm(
      `Excluir o contrato "${contract.code}"? Esta ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await apiRequest(`/api/contracts/${contract.id}`, { method: "DELETE" });
      if (editingId === contract.id) {
        requestClose();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao excluir contrato");
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.sectionHead}>
        <div>
          <h1>Contratos</h1>
          <p className="muted">
            {loading
              ? "Carregando contratos…"
              : contracts.length === 1
                ? "1 contrato cadastrado"
                : `${contracts.length} contratos cadastrados`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          Novo contrato
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className={`${styles.listPanel} panel`}>
        <div className={styles.listToolbar}>
          <h2>Lista de contratos</h2>
          <div className={styles.searchField}>
            <label className="sr-only" htmlFor="contract-search">
              Buscar contratos
            </label>
            <input
              id="contract-search"
              type="search"
              placeholder="Buscar por código, título ou cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <p className="empty-state">Carregando…</p>
        ) : contracts.length === 0 ? (
          <p className="empty-state">Nenhum contrato cadastrado. Clique em Novo contrato para cadastrar o primeiro.</p>
        ) : listedContracts.length === 0 ? (
          <p className="empty-state">Nenhum contrato corresponde à busca.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>
                    <SortHeader
                      label="Cliente"
                      active={sortKey === "client"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.client}
                      hintAsc={SORT_HINT.client.asc}
                      hintDesc={SORT_HINT.client.desc}
                      alpha
                      onToggle={() => toggleSort("client")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Código"
                      active={sortKey === "code"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.code}
                      hintAsc={SORT_HINT.code.asc}
                      hintDesc={SORT_HINT.code.desc}
                      alpha
                      onToggle={() => toggleSort("code")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Título"
                      active={sortKey === "title"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.title}
                      hintAsc={SORT_HINT.title.asc}
                      hintDesc={SORT_HINT.title.desc}
                      alpha
                      onToggle={() => toggleSort("title")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Valor mensal"
                      active={sortKey === "value"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.value}
                      hintAsc={SORT_HINT.value.asc}
                      hintDesc={SORT_HINT.value.desc}
                      onToggle={() => toggleSort("value")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="SLA"
                      active={sortKey === "sla"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.sla}
                      hintAsc={SORT_HINT.sla.asc}
                      hintDesc={SORT_HINT.sla.desc}
                      onToggle={() => toggleSort("sla")}
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
                {listedContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <strong>{clientName(contract.clientId)}</strong>
                    </td>
                    <td>{contract.code}</td>
                    <td>{contract.title}</td>
                    <td>{formatMoneyBRL(contract.value)}</td>
                    <td>
                      Resposta {contract.responseMinutes} min / Resolução{" "}
                      {contract.resolutionMinutes} min
                    </td>
                    <td>
                      <span className={contractStatusBadgeClass(contract.status)}>
                        {labelContractStatus(contract.status)}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => startEdit(contract)}
                          title="Editar informações do contrato"
                          aria-label="Editar informações do contrato"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => void removeContract(contract)}
                          title="Excluir contrato"
                          aria-label="Excluir contrato"
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
          aria-labelledby="contract-dialog-title"
          onClose={resetForm}
          onMouseDown={(event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <div className={styles.dialogCard}>
            <div className={styles.sectionHead}>
              <h2 id="contract-dialog-title">{editingId ? "Editar contrato" : "Novo contrato"}</h2>
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
                  <label htmlFor="clientId">Cliente</label>
                  <select
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="code">Código</label>
                  <input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="title">Título</label>
                  <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="value">Valor mensal</label>
                  <input
                    id="value"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={value}
                    onChange={(e) => setValue(maskMoneyInput(e.target.value))}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="startDate">Início</label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="status">Situação</label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {CONTRACT_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="responseMinutes">SLA de resposta (minutos)</label>
                  <input
                    id="responseMinutes"
                    type="number"
                    min="1"
                    value={responseMinutes}
                    onChange={(e) => setResponseMinutes(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="resolutionMinutes">SLA de resolução (minutos)</label>
                  <input
                    id="resolutionMinutes"
                    type="number"
                    min="1"
                    value={resolutionMinutes}
                    onChange={(e) => setResolutionMinutes(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button className="btn btn-primary" type="submit" disabled={saving || !clientId}>
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
