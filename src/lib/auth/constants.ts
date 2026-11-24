// Rotas da API que não exigem login.
export const PUBLIC_API_PATHS = ["/api/health", "/api/auth/login", "/api/metrics"] as const;

// Só o gestor acessa: clientes e relatórios de SLA e rentabilidade (403 para o técnico).
export const GESTOR_ONLY_API_PREFIXES = [
  "/api/clients",
  "/api/sla",
  "/api/profitability",
] as const;

// Exigem JWT válido; sem token o middleware responde 401.
export const PROTECTED_API_PREFIXES = [
  "/api/users",
  "/api/clients",
  "/api/contracts",
  "/api/tickets",
  "/api/sla",
  "/api/profitability",
] as const;

export const AUTH_HEADER = "authorization";
// Headers internos que o middleware preenche com o usuário autenticado.
export const USER_ID_HEADER = "x-user-id";
export const USER_EMAIL_HEADER = "x-user-email";
export const USER_ROLE_HEADER = "x-user-role";
