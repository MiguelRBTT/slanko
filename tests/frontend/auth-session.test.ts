import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  getSession,
  getToken,
  saveSession,
  type Session,
} from "@/lib/client/auth-session";

const sample: Session = {
  token: "jwt-token",
  user: {
    id: "u1",
    name: "Gestor",
    email: "gestor@slanko.local",
    role: "GESTOR",
    hourlyCost: "100.00",
    active: true,
  },
};

describe("auth-session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saves and reads a session", () => {
    saveSession(sample);
    expect(getSession()).toEqual(sample);
    expect(getToken()).toBe("jwt-token");
  });

  it("returns null when storage is empty", () => {
    expect(getSession()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("clears the session", () => {
    saveSession(sample);
    clearSession();
    expect(getSession()).toBeNull();
  });

  it("clears invalid JSON from storage", () => {
    localStorage.setItem("slanko.session", "{broken");
    expect(getSession()).toBeNull();
    expect(localStorage.getItem("slanko.session")).toBeNull();
  });

  it("returns null when window is undefined", () => {
    const original = globalThis.window;
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    expect(getSession()).toBeNull();
    globalThis.window = original;
  });
});
