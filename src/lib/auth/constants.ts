export const PUBLIC_API_PATHS = ["/api/health", "/api/auth/login"] as const;

export const GESTOR_ONLY_API_PREFIXES = ["/api/clients", "/api/contracts"] as const;

export const PROTECTED_API_PREFIXES = ["/api/users", "/api/clients", "/api/contracts", "/api/tickets"] as const;

export const AUTH_HEADER = "authorization";
export const USER_ID_HEADER = "x-user-id";
export const USER_EMAIL_HEADER = "x-user-email";
export const USER_ROLE_HEADER = "x-user-role";
