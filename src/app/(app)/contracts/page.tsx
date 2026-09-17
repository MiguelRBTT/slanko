"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import type { PublicClient } from "@/types/client";
import type { PublicContract } from "@/types/contract";
import styles from "../page-shared.module.css";

type ClientsPayload = { clients: PublicClient[] };
type ContractsPayload = { contracts: PublicContract[] };

export default function ContractsPage() {
  const [contracts, setContracts] = useState<PublicContract[]>([]);
  const [clients, setClients] = useState<PublicClient[]>([]);
  const [clientId, setClientId] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("4500");
  const [startDate, setStartDate] = useState("2026-01-01");
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

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await apiRequest("/api/contracts", {
        method: "POST",
        body: {
          clientId,
          code,
          title,
          value: Number(value),
          startDate,
          status: "ACTIVE",
          responseMinutes: Number(responseMinutes),
          resolutionMinutes: Number(resolutionMinutes),
        },
      });
      setCode("");
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao criar contrato");
    } finally {
      setSaving(false);
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

      <form className={`${styles.formPanel} panel`} onSubmit={onCreate}>
        <h2>Novo contrato</h2>
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
            <label htmlFor="value">Valor (R$)</label>
            <input
              id="value"
              type="number"
              min="1"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
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
            <label htmlFor="responseMinutes">SLA resposta (min)</label>
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
            <label htmlFor="resolutionMinutes">SLA resolução (min)</label>
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
        <button className="btn btn-primary" type="submit" disabled={saving || !clientId}>
          {saving ? "Salvando…" : "Cadastrar"}
        </button>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td>
                      <strong>{contract.code}</strong>
                    </td>
                    <td>{contract.title}</td>
                    <td>R$ {contract.value}</td>
                    <td>
                      {contract.responseMinutes} / {contract.resolutionMinutes} min
                    </td>
                    <td>
                      <span className="badge badge-neutral">{contract.status}</span>
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
