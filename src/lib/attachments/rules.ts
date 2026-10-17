import { BadRequestError } from "@/lib/errors/app-error";

export type AttachmentKind = "IMAGE" | "VIDEO";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ATTACHMENTS_PER_TICKET = 10;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function resolveAttachmentKind(mimeType: string): AttachmentKind {
  const normalized = mimeType.trim().toLowerCase();

  if (IMAGE_MIME_TYPES.has(normalized)) {
    return "IMAGE";
  }

  if (VIDEO_MIME_TYPES.has(normalized)) {
    return "VIDEO";
  }

  throw new BadRequestError(
    "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM",
  );
}

export function maxBytesForKind(kind: AttachmentKind): number {
  return kind === "IMAGE" ? IMAGE_MAX_BYTES : VIDEO_MAX_BYTES;
}

export function extensionForMime(mimeType: string): string {
  const ext = EXTENSION_BY_MIME[mimeType.trim().toLowerCase()];
  if (!ext) {
    throw new BadRequestError("Unsupported file type");
  }
  return ext;
}

export function assertAttachmentSize(kind: AttachmentKind, sizeBytes: number): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new BadRequestError("File is empty or invalid");
  }

  const limit = maxBytesForKind(kind);
  if (sizeBytes > limit) {
    const label = kind === "IMAGE" ? "5 MB" : "50 MB";
    throw new BadRequestError(
      `${kind === "IMAGE" ? "Image" : "Video"} exceeds the ${label} size limit`,
    );
  }
}

export function sanitizeOriginalFileName(fileName: string): string {
  const base = fileName.trim().replace(/[/\\]/g, "_").slice(0, 180);
  if (!base) {
    throw new BadRequestError("fileName is required");
  }
  return base;
}

export function assertCanAddAttachment(currentCount: number): void {
  if (currentCount >= MAX_ATTACHMENTS_PER_TICKET) {
    throw new BadRequestError(
      `A ticket can have at most ${MAX_ATTACHMENTS_PER_TICKET} attachments`,
    );
  }
}
