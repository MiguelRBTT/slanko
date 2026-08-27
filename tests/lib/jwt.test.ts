import { describe, expect, it } from "vitest";
import { extractBearerToken, signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";

describe("jwt helpers", () => {
  it("signs and verifies an access token", async () => {
    const token = await signAccessToken({
      userId: "user-1",
      email: "gestor@slanko.local",
      role: "GESTOR",
    });

    const authContext = await verifyAccessToken(token);

    expect(authContext).toEqual({
      userId: "user-1",
      email: "gestor@slanko.local",
      role: "GESTOR",
    });
  });

  it("extracts bearer tokens from the Authorization header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("Basic abc123")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it("rejects invalid tokens", async () => {
    await expect(verifyAccessToken("invalid.token.value")).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
