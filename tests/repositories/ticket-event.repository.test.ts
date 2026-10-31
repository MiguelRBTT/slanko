import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TicketEventRepository } from "@/repositories/ticket-event.repository";
import { TicketAttachmentRepository } from "@/repositories/ticket-attachment.repository";

describe("TicketEventRepository", () => {
  const mockDb = {
    ticketEvent: { findMany: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the ticket history in chronological order with the actor name", async () => {
    mockDb.ticketEvent.findMany.mockResolvedValue([]);

    const repository = new TicketEventRepository(mockDb as unknown as PrismaClient);
    await repository.findByTicketId("ticket-1");

    expect(mockDb.ticketEvent.findMany).toHaveBeenCalledWith({
      where: { ticketId: "ticket-1" },
      include: { actor: { select: { name: true } } },
      orderBy: { sequence: "asc" },
    });
  });
});

describe("TicketAttachmentRepository history events", () => {
  const mockDb = {
    ticketAttachment: { create: vi.fn(), delete: vi.fn() },
    ticketEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  const attachment = {
    id: "att-1",
    ticketId: "ticket-1",
    fileName: "erro.png",
    kind: "IMAGE",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockDb) => unknown) =>
      callback(mockDb),
    );
  });

  it("records ATTACHMENT_ADDED together with the upload", async () => {
    mockDb.ticketAttachment.create.mockResolvedValue(attachment);

    const repository = new TicketAttachmentRepository(mockDb as unknown as PrismaClient);
    await repository.create({
      ticketId: "ticket-1",
      uploadedById: "user-1",
      kind: "IMAGE",
      fileName: "erro.png",
      mimeType: "image/png",
      sizeBytes: 10,
      storageKey: "tickets/ticket-1/x.png",
    });

    expect(mockDb.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        actorId: "user-1",
        type: "ATTACHMENT_ADDED",
        data: { attachmentId: "att-1", fileName: "erro.png", kind: "IMAGE" },
      },
    });
  });

  it("records ATTACHMENT_REMOVED together with the removal", async () => {
    mockDb.ticketAttachment.delete.mockResolvedValue(attachment);

    const repository = new TicketAttachmentRepository(mockDb as unknown as PrismaClient);
    await repository.delete("att-1", "user-2");

    expect(mockDb.ticketAttachment.delete).toHaveBeenCalledWith({ where: { id: "att-1" } });
    expect(mockDb.ticketEvent.create).toHaveBeenCalledWith({
      data: {
        ticketId: "ticket-1",
        actorId: "user-2",
        type: "ATTACHMENT_REMOVED",
        data: { attachmentId: "att-1", fileName: "erro.png", kind: "IMAGE" },
      },
    });
  });
});
