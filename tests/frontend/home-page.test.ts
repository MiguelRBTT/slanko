import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  const error = new Error(`NEXT_REDIRECT:${url}`);
  throw error;
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

describe("HomePage", () => {
  it("redirects to login", async () => {
    const { default: HomePage } = await import("@/app/page");

    expect(() => HomePage()).toThrow(/NEXT_REDIRECT:\/login/);
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
