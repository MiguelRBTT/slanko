import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors/app-error";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@/lib/attachments/rules";
import { TicketAttachmentService } from "@/services/ticket-attachment.service";
import type { TicketAttachmentRepository } from "@/repositories/ticket-attachment.repository";
import type { TicketRepository } from "@/repositories/ticket.repository";

vi.mock("@/lib/attachments/storage", () => ({
  saveTicketAttachmentFile: vi.fn(async () => "tickets/ticket-1/file.jpg"),
  readTicketAttachmentFile: vi.fn(async () => Buffer.from("img")),
  deleteTicketAttachmentFile: vi.fn(async () => undefined),
  deleteTicketAttachmentFiles: vi.fn(async () => undefined),
}));

import {
  deleteTicketAttachmentFile,
  deleteTicketAttachmentFiles,
  readTicketAttachmentFile,
  saveTicketAttachmentFile,
} from "@/lib/attachments/storage";

const tecnicoAuth = {
  userId: "user-tecnico",
  email: "tecnico@slanko.local",
  role: "TECNICO" as const,
};

const otherAuth = {
  userId: "user-other",
  email: "other@slanko.local",
  role: "TECNICO" as const,
};

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const MP4_BYTES = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42")]);

const openTicket = {
  id: "ticket-1",
  openedById: "user-gestor",
  assignedToId: "user-tecnico",
  observers: [] as Array<{ userId: string }>,
  status: "OPEN" as const,
};

const sampleAttachment = {
  id: "att-1",
  ticketId: "ticket-1",
  uploadedById: "user-tecnico",
  kind: "IMAGE" as const,
  fileName: "print.png",
  mimeType: "image/png",
  sizeBytes: 1200,
  storageKey: "tickets/ticket-1/file.jpg",
  createdAt: new Date("2026-10-16T12:00:00.000Z"),
};

describe("TicketAttachmentService", () => {
  const mockAttachments = {
    findByTicketId: vi.fn(),
    findById: vi.fn(),
    countByTicketId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteManyByTicketId: vi.fn(),
  } as unknown as TicketAttachmentRepository;

  const mockTickets = {
    findById: vi.fn(),
  } as unknown as TicketRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists attachments for an accessible ticket", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.findByTicketId).mockResolvedValue([sampleAttachment]);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    const rows = await service.listAttachments("ticket-1", tecnicoAuth);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.url).toContain("/attachments/att-1/file");
  });

  it("creates an image attachment within the size limit", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.countByTicketId).mockResolvedValue(0);
    vi.mocked(mockAttachments.create).mockResolvedValue(sampleAttachment);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    const created = await service.createAttachment(
      "ticket-1",
      {
        bytes: PNG_BYTES,
        fileName: "print.png",
        mimeType: "image/png",
        sizeBytes: 2048,
      },
      tecnicoAuth,
    );

    expect(saveTicketAttachmentFile).toHaveBeenCalled();
    expect(created.kind).toBe("IMAGE");
    expect(mockAttachments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "ticket-1",
        kind: "IMAGE",
        mimeType: "image/png",
      }),
    );
  });

  it("creates a video attachment within the video size limit", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.countByTicketId).mockResolvedValue(1);
    vi.mocked(mockAttachments.create).mockResolvedValue({
      ...sampleAttachment,
      id: "att-2",
      kind: "VIDEO",
      fileName: "demo.mp4",
      mimeType: "video/mp4",
      sizeBytes: 10_000_000,
    });

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    const created = await service.createAttachment(
      "ticket-1",
      {
        bytes: MP4_BYTES,
        fileName: "demo.mp4",
        mimeType: "video/mp4",
        sizeBytes: 10_000_000,
      },
      tecnicoAuth,
    );

    expect(created.kind).toBe("VIDEO");
  });

  it("rejects oversized image and video uploads", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.countByTicketId).mockResolvedValue(0);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);

    await expect(
      service.createAttachment(
        "ticket-1",
        {
          bytes: Buffer.from("x"),
          fileName: "big.png",
          mimeType: "image/png",
          sizeBytes: IMAGE_MAX_BYTES + 1,
        },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    await expect(
      service.createAttachment(
        "ticket-1",
        {
          bytes: Buffer.from("x"),
          fileName: "big.mp4",
          mimeType: "video/mp4",
          sizeBytes: VIDEO_MAX_BYTES + 1,
        },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(saveTicketAttachmentFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types and closed tickets", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.countByTicketId).mockResolvedValue(0);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);

    await expect(
      service.createAttachment(
        "ticket-1",
        {
          bytes: Buffer.from("x"),
          fileName: "doc.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    vi.mocked(mockTickets.findById).mockResolvedValue({
      ...openTicket,
      status: "CLOSED",
    } as never);

    await expect(
      service.createAttachment(
        "ticket-1",
        {
          bytes: Buffer.from("x"),
          fileName: "print.png",
          mimeType: "image/png",
          sizeBytes: 100,
        },
        tecnicoAuth,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("rejects unauthorized users", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    const service = new TicketAttachmentService(mockAttachments, mockTickets);

    await expect(service.listAttachments("ticket-1", otherAuth)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("reads and deletes an attachment file", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.findById).mockResolvedValue(sampleAttachment);
    vi.mocked(mockAttachments.delete).mockResolvedValue(sampleAttachment);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    const file = await service.getAttachmentFile("ticket-1", "att-1", tecnicoAuth);

    expect(file.mimeType).toBe("image/png");
    expect(readTicketAttachmentFile).toHaveBeenCalledWith("tickets/ticket-1/file.jpg");

    await service.deleteAttachment("ticket-1", "att-1", tecnicoAuth);
    expect(mockAttachments.delete).toHaveBeenCalledWith("att-1", "user-tecnico");
    expect(deleteTicketAttachmentFile).toHaveBeenCalledWith("tickets/ticket-1/file.jpg");
  });

  it("throws when attachment is missing", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.findById).mockResolvedValue(null);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    await expect(
      service.deleteAttachment("ticket-1", "missing", tecnicoAuth),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes all files for a ticket", async () => {
    vi.mocked(mockAttachments.findByTicketId).mockResolvedValue([sampleAttachment]);
    vi.mocked(mockAttachments.deleteManyByTicketId).mockResolvedValue({ count: 1 });

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    await service.deleteAllForTicket("ticket-1");

    expect(deleteTicketAttachmentFiles).toHaveBeenCalledWith(["tickets/ticket-1/file.jpg"]);
    expect(mockAttachments.deleteManyByTicketId).toHaveBeenCalledWith("ticket-1");
  });

  it("rejects a file whose content does not match the declared type", async () => {
    vi.mocked(mockTickets.findById).mockResolvedValue(openTicket as never);
    vi.mocked(mockAttachments.countByTicketId).mockResolvedValue(0);

    const service = new TicketAttachmentService(mockAttachments, mockTickets);
    await expect(
      service.createAttachment(
        "ticket-1",
        {
          // Um HTML renomeado para .png não pode virar anexo de imagem.
          bytes: Buffer.from("<html><script>alert(1)</script></html>"),
          fileName: "foto.png",
          mimeType: "image/png",
          sizeBytes: 38,
        },
        tecnicoAuth,
      ),
    ).rejects.toThrow("File content does not match its declared type");
    expect(mockAttachments.create).not.toHaveBeenCalled();
  });
});
