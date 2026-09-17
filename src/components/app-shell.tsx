"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getSession, type SessionUser } from "@/lib/client/auth-session";
import styles from "./app-shell.module.css";

const NAV = [
  { href: "/dashboard", label: "Painel" },
  { href: "/clients", label: "Clientes", gestorOnly: true },
  { href: "/contracts", label: "Contratos", gestorOnly: true },
  { href: "/tickets", label: "Chamados" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setUser(session.user);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready || !user) return;

    for (const item of NAV) {
      if ("gestorOnly" in item && item.gestorOnly && user.role !== "GESTOR") continue;
      router.prefetch(item.href);
    }
  }, [ready, user, router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!ready || !user) {
    return <div className={styles.loading}>Carregando sessão…</div>;
  }

  const links = NAV.filter((item) => !("gestorOnly" in item && item.gestorOnly) || user.role === "GESTOR");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <Link href="/dashboard" className={styles.brand} prefetch>
            Slanko
          </Link>
          <p className={styles.brandTag}>Suporte com visão de negócio</p>
        </div>

        <nav className={styles.nav}>
          {links.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.userBox}>
          <div>
            <strong>{user.name}</strong>
            <p>{user.role === "GESTOR" ? "Gestor" : "Técnico"}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
