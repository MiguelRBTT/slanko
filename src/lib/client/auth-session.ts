export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "GESTOR" | "TECNICO";
  hourlyCost: string;
  active: boolean;
};

export type Session = {
  token: string;
  user: SessionUser;
};

const STORAGE_KEY = "slanko.session";

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Session;
  } catch {
    clearSession();
    return null;
  }
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}
