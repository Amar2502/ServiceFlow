import { Request, Response } from "express";
import { db } from "../../config/db";
import imagekit from "../../config/imagekit";
import { SocketEmitter } from "../../socket";

export const getImageKitAuthParams = async (_req: Request, res: Response) => {
  try {
    const authParams = imagekit.getAuthenticationParameters();
    return res.status(200).json(authParams);
  } catch (error) {
    console.error("[ImageKit Auth Error]:", error);
    return res.status(500).json({ message: "Failed to generate ImageKit authentication parameters" });
  }
};

export const createMessage = async (req: Request, res: Response) => {
  const { complaintId, body, isInternal, senderType, attachments } = req.body;
  const user = req.user;

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, tenantId: true },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const senderName = user?.name || (senderType === "CUSTOMER" ? "Customer" : "Support Agent");
    const senderId = user?.userId || null;

    const messageRecord = await db.ticketMessage.create({
      data: {
        complaintId,
        senderId,
        senderName,
        senderType: senderType || (user?.role === "ADMIN" ? "ADMIN" : "AGENT"),
        isInternal: Boolean(isInternal),
        body,
        attachments: attachments || [],
      },
    });

    const payload = {
      id: messageRecord.id,
      complaint_id: messageRecord.complaintId,
      sender_id: messageRecord.senderId,
      sender_name: messageRecord.senderName,
      sender_type: messageRecord.senderType,
      is_internal: messageRecord.isInternal,
      body: messageRecord.body,
      attachments: messageRecord.attachments,
      created_at: messageRecord.createdAt,
    };

    // Broadcast real-time Socket.io message event
    SocketEmitter.emitToTicket(complaintId, "ticket:message_received", payload);
    SocketEmitter.emitToTenant(complaint.tenantId, "ticket:message_received", payload);

    return res.status(201).json({
      message: "Ticket message created successfully",
      ticket_message: payload,
    });
  } catch (error) {
    console.error("[CreateMessage Error]:", error);
    return res.status(500).json({ message: "Internal server error creating ticket message" });
  }
};

export const getMessagesForComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.params as { complaintId: string };
  const user = req.user;

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, tenantId: true },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Security Filter: If user is authenticated as staff (ADMIN / AGENT), fetch all messages.
    // Otherwise, exclude private internal investigation notes (isInternal: false only).
    const isStaff = Boolean(user && (user.role === "ADMIN" || user.role === "AGENT"));

    const messages = await db.ticketMessage.findMany({
      where: {
        complaintId,
        ...(isStaff ? {} : { isInternal: false }),
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      complaint_id: m.complaintId,
      sender_id: m.senderId,
      sender_name: m.senderName,
      sender_type: m.senderType,
      is_internal: m.isInternal,
      body: m.body,
      attachments: m.attachments,
      created_at: m.createdAt,
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error("[GetMessagesForComplaint Error]:", error);
    return res.status(500).json({ message: "Internal server error fetching ticket messages" });
  }
};
