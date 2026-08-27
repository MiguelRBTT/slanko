import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { verifyPassword } from "@/lib/auth/password";

describe("verifyPassword", () => {
  it("returns true for matching passwords", async () => {
    const hash = await bcrypt.hash("Slanko@123", 10);

    await expect(verifyPassword("Slanko@123", hash)).resolves.toBe(true);
  });

  it("returns false for non-matching passwords", async () => {
    const hash = await bcrypt.hash("Slanko@123", 10);

    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
