"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { formatMoneyBRL, maskMoneyInput, parseMoneyInput } from "@/lib/client/format";
import {
  contractStatusBadgeClass,
  labelContractStatus,
} from "@/lib/client/labels";
import type { PublicClient } from "@/types/client";
import type { PublicContract } from "@/types/contract";
import styles from "../page-shared.module.css";

type ClientsPayload = { clients: PublicClient[] };
type ContractsPayload = { contracts: PublicContract[] };

const CONTRACT_STATUSES = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "SUSPENDED", label: "Suspenso" },
  { value: "FINISHED", label: "Finalizado" },
] as const;

export default function ContractsPage() {
  const [contracts, setContracts] = useState<PublicContract[]>([]);
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState(formatMoneyBRL(4500));
  const [startDate, setStartDate] = useState("2026-01-01");
  const [status, setStatus] = useState("ACTIVE");
  const [responseMinutes, setResponseMinutes] = useState("60");
  const [resolutionMinutes, setResolutionMinutes] = useState("480");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  function resetForm() {
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
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const parsedValue = parseMoneyInput(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setError("Informe um valor válido em reais (ex.: 10.000,00).");
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

      resetForm();
      await load();
    } catch (err) {
      setError(
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
        resetForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao excluir contrato");
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Contratos</h1>
          <p className="muted">Valor, vigência e metas de SLA por cliente.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className={`${styles.formPanel} panel`} onSubmit={onSubmit}>
        <h2>{editingId ? "Editar contrato" : "Novo contrato"}</h2>
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
            <label htmlFor="value">Valor</label>
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
        ) : contracts.length === 0 ? (
          <p className="empty-state">Nenhum contrato cadastrado.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Valor</th>
                  <th>SLA</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <strong>{contract.code}</strong>
                    </td>
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
                          className="btn btn-ghost"
                          onClick={() => startEdit(contract)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => void removeContract(contract)}
                        >
                          Excluir
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
