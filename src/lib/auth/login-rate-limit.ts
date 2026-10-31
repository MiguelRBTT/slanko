import { AppError } from "@/lib/errors/app-error";

// Limite de tentativas de login (proteção contra força bruta). Contador em memória por
// processo: suficiente para uma instância; com várias réplicas, trocar por Redis.

export const MAX_FAILED_LOGINS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Acima disso, entradas expiradas são descartadas (evita crescer sem limite). */
const PRUNE_THRESHOLD = 10_000;

export class TooManyRequestsError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many login attempts. Try again later.", 429);
    this.name = "TooManyRequestsError";
  }
}

type Attempts = { count: number; firstAt: number };

export class LoginRateLimiter {
  private readonly attempts = new Map<string, Attempts>();

  constructor(
    private readonly maxFailures = MAX_FAILED_LOGINS,
    private readonly windowMs = LOGIN_WINDOW_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  static key(ip: string, email: string): string {
    return `${ip}|${email.trim().toLowerCase()}`;
  }

  /** Lança 429 se a chave já esgotou as tentativas dentro da janela. */
  assertAllowed(key: string): void {
    const entry = this.current(key);

    if (entry && entry.count >= this.maxFailures) {
      const retryAfterMs = entry.firstAt + this.windowMs - this.now();
      throw new TooManyRequestsError(Math.max(1, Math.ceil(retryAfterMs / 1000)));
    }
  }

  recordFailure(key: string): void {
    const entry = this.current(key);

    if (entry) {
      entry.count += 1;
      return;
    }

    if (this.attempts.size >= PRUNE_THRESHOLD) {
      this.pruneExpired();
    }

    this.attempts.set(key, { count: 1, firstAt: this.now() });
  }

  get size(): number {
    return this.attempts.size;
  }

  private pruneExpired(): void {
    const now = this.now();

    for (const [key, entry] of this.attempts) {
      if (now - entry.firstAt >= this.windowMs) {
        this.attempts.delete(key);
      }
    }
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private current(key: string): Attempts | undefined {
    const entry = this.attempts.get(key);

    if (entry && this.now() - entry.firstAt >= this.windowMs) {
      this.attempts.delete(key);
      return undefined;
    }

    return entry;
  }
}

export const loginRateLimiter = new LoginRateLimiter();

/**
 * IP do cliente para o limite de login. Cabeçalhos de proxy só são confiáveis atrás de um
 * proxy reverso que os sobrescreve (TRUST_PROXY=true); sem isso, qualquer cliente poderia
 * trocar o "IP" a cada tentativa. Nesse caso o limite vale por email.
 */
export function clientIp(request: Request, trustProxy = process.env.TRUST_PROXY === "true"): string {
  if (!trustProxy) {
    return "direct";
  }

  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "direct";
}
