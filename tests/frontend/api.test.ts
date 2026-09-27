import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiRequest } from "@/lib/client/api";
import * as authSession from "@/lib/client/auth-session";

describe("apiRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends JSON body and returns payload", async () => {
    vi.spyOn(authSession, "getToken").mockReturnValue("tok");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<{ ok: boolean }>("/api/health", {
      method: "GET",
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer tok",
        }),
      }),
    );
  });

  it("throws when auth is required and token is missing", async () => {
    vi.spyOn(authSession, "getToken").mockReturnValue(null);

    await expect(apiRequest("/api/clients")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 401,
    });
  });

  it("skips Authorization when auth is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "x" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/auth/login", {
      auth: false,
      body: { email: "a", password: "b" },
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.method).toBe("POST");
  });

  it("clears session and throws on 401", async () => {
    vi.spyOn(authSession, "getToken").mockReturnValue("tok");
    const clearSpy = vi.spyOn(authSession, "clearSession");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      }),
    );

    await expect(apiRequest("/api/clients")).rejects.toBeInstanceOf(ApiClientError);
    expect(clearSpy).toHaveBeenCalled();
  });

  it("throws ApiClientError with fallback message", async () => {
    vi.spyOn(authSession, "getToken").mockReturnValue("tok");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("no json");
        },
      }),
    );

    await expect(apiRequest("/api/clients")).rejects.toMatchObject({
      message: "Falha na requisição",
      status: 500,
    });
  });
});
