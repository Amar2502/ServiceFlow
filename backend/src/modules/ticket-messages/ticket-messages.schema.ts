import { z } from "zod";

export const CreateMessageSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID format"),
  body: z.string().min(1, "Message body cannot be empty"),
  isInternal: z.boolean().default(false),
  senderType: z.enum(["CUSTOMER", "AGENT", "ADMIN", "SYSTEM"]).default("AGENT"),
  attachments: z
    .array(
      z.object({
        fileId: z.string().optional(),
        name: z.string().optional(),
        url: z.string().url("Invalid attachment URL"),
        fileType: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export const GetMessagesParamSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID parameter format"),
});
