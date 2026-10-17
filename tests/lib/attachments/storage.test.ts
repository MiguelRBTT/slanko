import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tempRoots: string[] = [];

describe("attachment storage", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    delete process.env.SLANKO_UPLOADS_DIR;
    await Promise.all(tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("saves, reads and deletes ticket attachment files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "slanko-uploads-"));
    tempRoots.push(root);
    process.env.SLANKO_UPLOADS_DIR = root;

    const storage = await import("@/lib/attachments/storage");
    const key = await storage.saveTicketAttachmentFile({
      ticketId: "ticket-1",
      mimeType: "image/png",
      bytes: Buffer.from("png-bytes"),
    });

    expect(key).toMatch(/^tickets\/ticket-1\/.+\.png$/);

    const bytes = await storage.readTicketAttachmentFile(key);
    expect(bytes.toString()).toBe("png-bytes");

    await storage.deleteTicketAttachmentFile(key);
    await expect(storage.readTicketAttachmentFile(key)).rejects.toThrow();
  });

  it("rejects unsafe storage keys", async () => {
    const storage = await import("@/lib/attachments/storage");
    expect(() => storage.resolveStoragePath("../etc/passwd")).toThrow(/Invalid storage key/);
    expect(() => storage.resolveStoragePath("tickets/../secret")).toThrow(/Invalid storage key/);
  });
});
