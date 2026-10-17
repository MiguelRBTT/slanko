import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/lib/errors/app-error";
import {
  IMAGE_MAX_BYTES,
  MAX_ATTACHMENTS_PER_TICKET,
  VIDEO_MAX_BYTES,
  assertAttachmentSize,
  assertCanAddAttachment,
  extensionForMime,
  resolveAttachmentKind,
  sanitizeOriginalFileName,
} from "@/lib/attachments/rules";

describe("attachment rules", () => {
  it("resolves image and video kinds from mime types", () => {
    expect(resolveAttachmentKind("image/jpeg")).toBe("IMAGE");
    expect(resolveAttachmentKind("image/png")).toBe("IMAGE");
    expect(resolveAttachmentKind("image/webp")).toBe("IMAGE");
    expect(resolveAttachmentKind("image/gif")).toBe("IMAGE");
    expect(resolveAttachmentKind("video/mp4")).toBe("VIDEO");
    expect(resolveAttachmentKind("video/webm")).toBe("VIDEO");
  });

  it("rejects unsupported mime types", () => {
    expect(() => resolveAttachmentKind("application/pdf")).toThrow(BadRequestError);
    expect(() => resolveAttachmentKind("video/avi")).toThrow(BadRequestError);
  });

  it("maps mime types to extensions", () => {
    expect(extensionForMime("image/jpeg")).toBe("jpg");
    expect(extensionForMime("video/mp4")).toBe("mp4");
  });

  it("enforces fair size limits for images and videos", () => {
    expect(() => assertAttachmentSize("IMAGE", IMAGE_MAX_BYTES)).not.toThrow();
    expect(() => assertAttachmentSize("VIDEO", VIDEO_MAX_BYTES)).not.toThrow();
    expect(() => assertAttachmentSize("IMAGE", IMAGE_MAX_BYTES + 1)).toThrow(/5 MB/);
    expect(() => assertAttachmentSize("VIDEO", VIDEO_MAX_BYTES + 1)).toThrow(/50 MB/);
    expect(() => assertAttachmentSize("IMAGE", 0)).toThrow(BadRequestError);
  });

  it("limits how many attachments a ticket can hold", () => {
    expect(() => assertCanAddAttachment(MAX_ATTACHMENTS_PER_TICKET - 1)).not.toThrow();
    expect(() => assertCanAddAttachment(MAX_ATTACHMENTS_PER_TICKET)).toThrow(
      /at most 10 attachments/,
    );
  });

  it("sanitizes original file names", () => {
    expect(sanitizeOriginalFileName("  foto/print.png  ")).toBe("foto_print.png");
    expect(() => sanitizeOriginalFileName("   ")).toThrow(BadRequestError);
  });
});
