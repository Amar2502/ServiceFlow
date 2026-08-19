import { Router } from "express";
import {
  createMessage,
  getImageKitAuthParams,
  getMessagesForComplaint,
} from "./ticket-messages.controller";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { CreateMessageSchema, GetMessagesParamSchema } from "./ticket-messages.schema";

const router = Router();

// ImageKit authentication endpoint for direct client uploads (ADMIN or AGENT)
router.get("/imagekit-auth", authenticateJwt, requireRole("ADMIN", "AGENT"), getImageKitAuthParams);

// Message creation (ADMIN or AGENT)
router.post("/create", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ body: CreateMessageSchema }), createMessage);

// Get message history (ADMIN or AGENT only)
router.get("/:complaintId", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ params: GetMessagesParamSchema }), getMessagesForComplaint);

export default router;
