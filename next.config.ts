import type { NextConfig } from "next";
import { STATIC_SECURITY_HEADERS } from "./src/lib/http/security-headers";

// Next.js configuration for the Slanko full-stack app.
// A CSP (com nonce) é aplicada no middleware; aqui ficam os headers fixos.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const headers = [...STATIC_SECURITY_HEADERS];

    // HSTS só em produção: no localhost ele "prenderia" outros projetos locais em HTTPS.
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
