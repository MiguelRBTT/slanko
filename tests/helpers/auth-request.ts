import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";

// Requests with the auth context the middleware injects after validating the JWT.

export const gestorAuthHeaders = {
  [USER_ID_HEADER]: "user-gestor",
  [USER_EMAIL_HEADER]: "gestor@slanko.local",
  [USER_ROLE_HEADER]: "GESTOR",
};

export const tecnicoAuthHeaders = {
  [USER_ID_HEADER]: "user-tecnico",
  [USER_EMAIL_HEADER]: "tecnico@slanko.local",
  [USER_ROLE_HEADER]: "TECNICO",
};

function withHeaders(base: Record<string, string>, url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: { ...base, ...(init.headers as Record<string, string> | undefined) },
  });
}

export function gestorRequest(url: string, init: RequestInit = {}) {
  return withHeaders(gestorAuthHeaders, url, init);
}

export function tecnicoRequest(url: string, init: RequestInit = {}) {
  return withHeaders(tecnicoAuthHeaders, url, init);
}
