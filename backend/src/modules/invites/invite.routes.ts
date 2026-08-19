import { Router } from "express";
import { createInvite, loginWithInvite } from "./invite.controller";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { CreateInviteSchema, LoginWithInviteSchema } from "./invite.schema";

const router = Router();

// Staff Invite creation is restricted to ADMIN users
router.post("/create", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: CreateInviteSchema }), createInvite);

// Public endpoint for users registering via invitation link
router.post("/login", validateRequest({ body: LoginWithInviteSchema }), loginWithInvite);

export default router;
