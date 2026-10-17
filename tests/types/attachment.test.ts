import { describe, expect, it } from "vitest";
import { toPublicAttachment } from "@/types/attachment";

describe("toPublicAttachment", () => {
  it("maps attachment fields and builds the file url", () => {
    const publicAttachment = toPublicAttachment({
      id: "att-1",
      ticketId: "ticket-1",
      uploadedById: "user-1",
      kind: "VIDEO",
      fileName: "clip.webm",
      mimeType: "video/webm",
      sizeBytes: 2048,
      createdAt: new Date("2026-10-16T12:00:00.000Z"),
    });

    expect(publicAttachment).toEqual({
      id: "att-1",
      ticketId: "ticket-1",
      uploadedById: "user-1",
      kind: "VIDEO",
      fileName: "clip.webm",
      mimeType: "video/webm",
      sizeBytes: 2048,
      createdAt: "2026-10-16T12:00:00.000Z",
      url: "/api/tickets/ticket-1/attachments/att-1/file",
    });
  });
});
