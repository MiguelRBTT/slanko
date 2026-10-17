import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { extensionForMime } from "@/lib/attachments/rules";

const UPLOADS_ROOT =
  process.env.SLANKO_UPLOADS_DIR?.trim() || path.join(process.cwd(), "uploads");

export function resolveStoragePath(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, "/");
  if (
    !normalized.startsWith("tickets/") ||
    normalized.includes("..") ||
    path.isAbsolute(normalized)
  ) {
    throw new Error("Invalid storage key");
  }

  return path.join(UPLOADS_ROOT, ...normalized.split("/"));
}

export async function saveTicketAttachmentFile(input: {
  ticketId: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<string> {
  const ext = extensionForMime(input.mimeType);
  const storageKey = `tickets/${input.ticketId}/${randomUUID()}.${ext}`;
  const absolutePath = resolveStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.bytes);

  return storageKey;
}

export async function readTicketAttachmentFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storageKey));
}

export async function deleteTicketAttachmentFile(storageKey: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storageKey));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

export async function deleteTicketAttachmentFiles(storageKeys: string[]): Promise<void> {
  await Promise.all(storageKeys.map((key) => deleteTicketAttachmentFile(key)));
}
