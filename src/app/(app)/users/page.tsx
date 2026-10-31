"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { apiRequest, ApiClientError } from "@/lib/client/api";
import { getSession } from "@/lib/client/auth-session";
import { formatMoneyBRL, maskMoneyInput, parseMoneyInput } from "@/lib/client/format";
import { matchesSearch } from "@/lib/client/search";
import type { PublicUser } from "@/types/user";
import { CloseIcon, EditIcon } from "../action-icons";
import styles from "../page-shared.module.css";
import { nextSortState, SortHeader, type SortDir } from "../sort-header";

type UsersPayload = { users: PublicUser[] };
type UserPayload = { user: PublicUser };
type Role = PublicUser["role"];
type SortKey = "name" | "role" | "hourlyCost" | "status";

const MIN_PASSWORD_LENGTH = 8;

const ROLE_LABEL: Record<Role, string> = {
  GESTOR: "Gestor",
  TECNICO: "Técnico",
};

const SORT_DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  role: "asc",
  hourlyCost: "desc",
  status: "asc",
};

const SORT_HINT: Record<SortKey, { asc: string; desc: string }> = {
  name: { asc: "Ordenar A–Z", desc: "Ordenar Z–A" },
  role: { asc: "Ordenar gestor → técnico", desc: "Ordenar técnico → gestor" },
  hourlyCost: { asc: "Ordenar menor → maior custo", desc: "Ordenar maior → menor custo" },
  status: { asc: "Ordenar ativo → inativo", desc: "Ordenar inativo → ativo" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("TECNICO");
  const [hourlyCost, setHourlyCost] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const editingSelf = editingId !== null && editingId === currentUserId;
  const activeCount = users.filter((user) => user.active).length;

  const listedUsers = useMemo(() => {
    const rows = users.filter((user) =>
      matchesSearch(search, user.name, user.email, ROLE_LABEL[user.role], user.active ? "ativo" : "inativo"),
    );
    const direction = sortDir === "asc" ? 1 : -1;

    rows.sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "hourlyCost":
          cmp = Number(a.hourlyCost) - Number(b.hourlyCost);
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
  }, [users, search, sortKey, sortDir]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest<UsersPayload>("/api/users?includeInactive=true");
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao listar a equipe");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentUserId(getSession()?.user.id ?? null);
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
    setRole("TECNICO");
    setHourlyCost("");
    setPassword("");
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
    resetForm();
    setShowForm(true);
  }

  function startEdit(user: PublicUser) {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setHourlyCost(formatMoneyBRL(user.hourlyCost));
    setPassword("");
    setShowForm(true);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsedCost = parseMoneyInput(hourlyCost);

    if (!Number.isFinite(parsedCost) || parsedCost <= 0) {
      setFormError("Informe o custo por hora em reais (ex.: 85,50). Ele é a base do cálculo de rentabilidade.");
      return;
    }

    if ((!editingId || password) && password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await apiRequest<UserPayload>(`/api/users/${editingId}`, {
          method: "PUT",
          body: {
            name,
            email,
            hourlyCost: parsedCost,
            ...(editingSelf ? {} : { role }),
            ...(password ? { password } : {}),
          },
        });
      } else {
        await apiRequest<UserPayload>("/api/users", {
          method: "POST",
          body: { name, email, role, hourlyCost: parsedCost, password },
        });
      }

      requestClose();
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiClientError
          ? err.status === 409
            ? "Já existe um usuário com esse email."
            : err.message
          : editingId
            ? "Falha ao atualizar usuário"
            : "Falha ao cadastrar usuário",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: PublicUser) {
    const confirmed = window.confirm(
      user.active
        ? `Desativar "${user.name}"? A pessoa não consegue mais entrar no sistema. Os apontamentos já feitos continuam valendo.`
        : `Reativar "${user.name}"?`,
    );

    if (!confirmed) return;

    setError(null);

    try {
      await apiRequest(`/api/users/${user.id}`, { method: "PUT", body: { active: !user.active } });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao alterar a situação do usuário");
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.sectionHead}>
        <div>
          <h1>Equipe</h1>
          <p className="muted">
            {loading
              ? "Carregando equipe…"
              : activeCount === 1
                ? "1 pessoa ativa"
                : `${activeCount} pessoas ativas`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateForm}>
          Nova pessoa
        </button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className={`${styles.listPanel} panel`}>
        <div className={styles.listToolbar}>
          <h2>Pessoas e custo por hora</h2>
          <div className={styles.searchField}>
            <label className="sr-only" htmlFor="user-search">
              Buscar pessoas
            </label>
            <input
              id="user-search"
              type="search"
              placeholder="Buscar por nome, email ou perfil…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <p className="muted">
          O custo por hora entra no cálculo de rentabilidade. Cada apontamento guarda o custo vigente no dia em que
          foi feito, então alterar o valor aqui só afeta os próximos apontamentos.
        </p>
        {loading ? (
          <p className="empty-state">Carregando…</p>
        ) : listedUsers.length === 0 ? (
          <p className="empty-state">Nenhuma pessoa corresponde à busca.</p>
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
                      label="Perfil"
                      active={sortKey === "role"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.role}
                      hintAsc={SORT_HINT.role.asc}
                      hintDesc={SORT_HINT.role.desc}
                      onToggle={() => toggleSort("role")}
                    />
                  </th>
                  <th>
                    <SortHeader
                      label="Custo por hora"
                      active={sortKey === "hourlyCost"}
                      sortDir={sortDir}
                      defaultDir={SORT_DEFAULT_DIR.hourlyCost}
                      hintAsc={SORT_HINT.hourlyCost.asc}
                      hintDesc={SORT_HINT.hourlyCost.desc}
                      onToggle={() => toggleSort("hourlyCost")}
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
                {listedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <div className="muted">{user.email}</div>
                    </td>
                    <td>{ROLE_LABEL[user.role]}</td>
                    <td>{formatMoneyBRL(user.hourlyCost)}</td>
                    <td>
                      <span className={`badge ${user.active ? "badge-ok" : "badge-neutral"}`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => startEdit(user)}
                          title="Editar pessoa"
                          aria-label={`Editar ${user.name}`}
                        >
                          <EditIcon />
                        </button>
                        {user.id !== currentUserId ? (
                          <button
                            type="button"
                            className={`btn btn-ghost ${styles.compact}`}
                            onClick={() => void toggleActive(user)}
                          >
                            {user.active ? "Desativar" : "Reativar"}
                          </button>
                        ) : null}
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
          aria-labelledby="user-dialog-title"
          onClose={resetForm}
          onMouseDown={(event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) requestClose();
          }}
        >
          <div className={styles.dialogCard}>
            <div className={styles.sectionHead}>
              <h2 id="user-dialog-title">{editingId ? "Editar pessoa" : "Nova pessoa"}</h2>
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
                  <label htmlFor="user-name">Nome</label>
                  <input id="user-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="user-email">Email</label>
                  <input
                    id="user-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="user-role">Perfil</label>
                  <select
                    id="user-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    disabled={editingSelf}
                  >
                    <option value="TECNICO">Técnico</option>
                    <option value="GESTOR">Gestor</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="user-cost">Custo por hora</label>
                  <input
                    id="user-cost"
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={hourlyCost}
                    onChange={(e) => setHourlyCost(maskMoneyInput(e.target.value))}
                  />
                </div>
                <div className={`field ${styles.full}`}>
                  <label htmlFor="user-password">{editingId ? "Nova senha (opcional)" : "Senha inicial"}</label>
                  <input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingId ? "Deixe em branco para manter a atual" : `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
                    required={!editingId}
                  />
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
