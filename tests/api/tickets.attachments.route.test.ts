import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/tickets/[id]/attachments/route";
import { DELETE } from "@/app/api/tickets/[id]/attachments/[attachmentId]/route";
import { GET as GET_FILE } from "@/app/api/tickets/[id]/attachments/[attachmentId]/file/route";
import { ticketAttachmentService } from "@/services/ticket-attachment.service";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from "@/lib/auth/constants";
import { BadRequestError, NotFoundError } from "@/lib/errors/app-error";

vi.mock("@/services/ticket-attachment.service", () => ({
  ticketAttachmentService: {
    listAttachments: vi.fn(),
    createAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    getAttachmentFile: vi.fn(),
  },
}));

const listContext = { params: Promise.resolve({ id: "ticket-1" }) };
const itemContext = {
  params: Promise.resolve({ id: "ticket-1", attachmentId: "att-1" }),
};

const authHeaders = {
  [USER_ID_HEADER]: "user-tecnico",
  [USER_EMAIL_HEADER]: "tecnico@slanko.local",
  [USER_ROLE_HEADER]: "TECNICO",
};

const sampleAttachment = {
  id: "att-1",
  ticketId: "ticket-1",
  uploadedById: "user-tecnico",
  kind: "IMAGE" as const,
  fileName: "print.png",
  mimeType: "image/png",
  sizeBytes: 1200,
  createdAt: "2026-10-16T12:00:00.000Z",
  url: "/api/tickets/ticket-1/attachments/att-1/file",
};

describe("ticket attachments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists attachments", async () => {
    vi.mocked(ticketAttachmentService.listAttachments).mockResolvedValue([sampleAttachment]);

    const response = await GET(
      new Request("http://localhost", { headers: authHeaders }),
      listContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attachments).toHaveLength(1);
  });

  it("uploads an attachment from multipart form data", async () => {
    vi.mocked(ticketAttachmentService.createAttachment).mockResolvedValue(sampleAttachment);

    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "print.png", { type: "image/png" }),
    );

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      }),
      listContext,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.attachment.id).toBe("att-1");
    expect(ticketAttachmentService.createAttachment).toHaveBeenCalledWith(
      "ticket-1",
      expect.objectContaining({
        fileName: "print.png",
        mimeType: "image/png",
        sizeBytes: 3,
      }),
      expect.objectContaining({ userId: "user-tecnico" }),
    );
  });

  it("rejects upload without file", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: authHeaders,
        body: new FormData(),
      }),
      listContext,
    );

    expect(response.status).toBe(400);
  });

  it("deletes an attachment", async () => {
    vi.mocked(ticketAttachmentService.deleteAttachment).mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost", { method: "DELETE", headers: authHeaders }),
      itemContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("streams attachment file bytes", async () => {
    vi.mocked(ticketAttachmentService.getAttachmentFile).mockResolvedValue({
      bytes: Buffer.from("hello"),
      mimeType: "image/png",
      fileName: "print.png",
    });

    const response = await GET_FILE(
      new Request("http://localhost", { headers: authHeaders }),
      itemContext,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(await response.text()).toBe("hello");
  });

  it("maps service errors to HTTP status", async () => {
    vi.mocked(ticketAttachmentService.listAttachments).mockRejectedValue(
      new NotFoundError("Ticket not found"),
    );
    const missing = await GET(
      new Request("http://localhost", { headers: authHeaders }),
      listContext,
    );
    expect(missing.status).toBe(404);

    vi.mocked(ticketAttachmentService.createAttachment).mockRejectedValue(
      new BadRequestError("Image exceeds the 5 MB size limit"),
    );
    const formData = new FormData();
    formData.append("file", new File([new Uint8Array([1])], "big.png", { type: "image/png" }));
    const oversized = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      }),
      listContext,
    );
    expect(oversized.status).toBe(400);
  });
});
