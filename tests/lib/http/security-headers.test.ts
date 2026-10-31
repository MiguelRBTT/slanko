import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  createNonce,
  STATIC_SECURITY_HEADERS,
} from "@/lib/http/security-headers";

describe("security headers", () => {
  it("creates a different nonce on each call", () => {
    expect(createNonce()).not.toBe(createNonce());
  });

  it("allows only nonce scripts in production", () => {
    const csp = buildContentSecurityPolicy("abc", false);

    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("relaxes only what the dev server needs", () => {
    const csp = buildContentSecurityPolicy("abc", true);

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });

  it("sends nosniff and blocks framing on every response", () => {
    const keys = STATIC_SECURITY_HEADERS.map((header) => header.key);

    expect(keys).toEqual(expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options"]));
  });
});
