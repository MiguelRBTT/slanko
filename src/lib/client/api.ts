import { clearSession, getToken } from "@/lib/client/auth-session";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

function authHeaders(): Record<string, string> {
  const token = getToken();

  if (!token) {
    throw new ApiClientError("Sessão expirada. Faça login novamente.", 401);
  }

  return { Authorization: `Bearer ${token}` };
}

async function parseError(response: Response): Promise<never> {
  if (response.status === 401) {
    clearSession();
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  throw new ApiClientError(payload.error ?? "Falha na requisição", response.status);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.auth !== false) {
    Object.assign(headers, authHeaders());
  }

  const response = await fetch(path, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    throw new ApiClientError(payload.error ?? "Falha na requisição", response.status);
  }

  return payload;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!response.ok) {
    return parseError(response);
  }

  return (await response.json()) as T;
}

export async function apiBlob(path: string, fallbackType?: string): Promise<Blob> {
  const response = await fetch(path, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    return parseError(response);
  }

  const buffer = await response.arrayBuffer();
  const type =
    response.headers.get("Content-Type")?.split(";")[0]?.trim() ||
    fallbackType ||
    "application/octet-stream";

  return new Blob([buffer], { type });
}
