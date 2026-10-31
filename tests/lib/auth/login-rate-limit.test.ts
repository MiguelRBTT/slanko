import { describe, expect, it } from "vitest";
import {
  clientIp,
  LoginRateLimiter,
  TooManyRequestsError,
} from "@/lib/auth/login-rate-limit";

describe("LoginRateLimiter", () => {
  it("blocks after the maximum number of failures and tells when to retry", () => {
    let now = 0;
    const limiter = new LoginRateLimiter(3, 60_000, () => now);
    const key = LoginRateLimiter.key("10.0.0.1", " Gestor@Slanko.local ");

    for (let i = 0; i < 3; i += 1) {
      limiter.assertAllowed(key);
      limiter.recordFailure(key);
    }

    now = 15_000;
    try {
      limiter.assertAllowed(key);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(TooManyRequestsError);
      expect((error as TooManyRequestsError).statusCode).toBe(429);
      expect((error as TooManyRequestsError).retryAfterSeconds).toBe(45);
    }
  });

  it("forgets failures after the window and on successful login", () => {
    let now = 0;
    const limiter = new LoginRateLimiter(2, 60_000, () => now);
    const key = LoginRateLimiter.key("10.0.0.1", "a@slanko.local");

    limiter.recordFailure(key);
    limiter.recordFailure(key);
    expect(() => limiter.assertAllowed(key)).toThrow(TooManyRequestsError);

    now = 60_000;
    expect(() => limiter.assertAllowed(key)).not.toThrow();

    limiter.recordFailure(key);
    limiter.reset(key);
    limiter.recordFailure(key);
    expect(() => limiter.assertAllowed(key)).not.toThrow();
  });

  it("normalizes the email and keeps different IPs apart", () => {
    expect(LoginRateLimiter.key("1.1.1.1", "A@B.com")).toBe(LoginRateLimiter.key("1.1.1.1", "a@b.com "));
    expect(LoginRateLimiter.key("1.1.1.1", "a@b.com")).not.toBe(LoginRateLimiter.key("2.2.2.2", "a@b.com"));
  });

  it("only trusts proxy headers behind a trusted proxy", () => {
    const spoofed = new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } });

    // Sem proxy confiável, o cabeçalho é ignorado (senão o atacante trocaria de "IP" a cada tentativa).
    expect(clientIp(spoofed, false)).toBe("direct");
    expect(clientIp(spoofed, true)).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "8.8.8.8" } }), true)).toBe("8.8.8.8");
    expect(clientIp(new Request("http://x"), true)).toBe("direct");
  });

  it("drops expired attempts instead of growing without limit", () => {
    let now = 0;
    const limiter = new LoginRateLimiter(5, 1_000, () => now);

    for (let i = 0; i < 10_000; i += 1) {
      limiter.recordFailure(LoginRateLimiter.key("direct", `user${i}@x`));
    }

    now = 2_000;
    limiter.recordFailure(LoginRateLimiter.key("direct", "novo@x"));

    expect(limiter.size).toBe(1);
  });
});
