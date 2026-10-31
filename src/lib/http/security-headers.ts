// Headers de segurança das páginas (RNF08). A CSP usa nonce por requisição:
// só scripts emitidos pelo próprio Next.js (que recebem o nonce) executam.

export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function buildContentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'unsafe-eval' só no desenvolvimento (React Refresh); em produção, só scripts com nonce.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Anexos são exibidos via blob: depois de baixados com o token.
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  // Sem "upgrade-insecure-requests": quebraria o container em HTTP acessado por IP.
  // Em produção com HTTPS, o HSTS (next.config.ts) já força HTTPS.
  return directives.join("; ");
}

/** Headers estáticos aplicados a todas as respostas (páginas e API). */
export const STATIC_SECURITY_HEADERS: Array<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
