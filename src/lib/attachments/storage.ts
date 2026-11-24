import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { extensionForMime } from "@/lib/attachments/rules";

// Pasta dos anexos no disco (no Docker, um volume); o banco guarda só o caminho relativo (storageKey).
const UPLOADS_ROOT =
  process.env.SLANKO_UPLOADS_DIR?.trim() || path.join(process.cwd(), "uploads");

/** Converte a chave do banco em caminho no disco e recusa "..", caminho absoluto ou fora de tickets/ (path traversal). */
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
  // Nome aleatório (UUID) no disco: o nome original do arquivo nunca vira caminho.
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
    // Arquivo que já não existe não é erro: a exclusão pode ser repetida sem falhar.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

export async function deleteTicketAttachmentFiles(storageKeys: string[]): Promise<void> {
  await Promise.all(storageKeys.map((key) => deleteTicketAttachmentFile(key)));
}
