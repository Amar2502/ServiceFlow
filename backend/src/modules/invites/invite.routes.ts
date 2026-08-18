import { Router } from "express";
import { createInvite, loginWithInvite } from "./invite.controller";
import { adminmiddleware } from "../../middlewares/adminmiddleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { CreateInviteSchema, LoginWithInviteSchema } from "./invite.schema";

const router = Router();

router.post("/create", adminmiddleware, validateRequest({ body: CreateInviteSchema }), createInvite);
router.post("/login", validateRequest({ body: LoginWithInviteSchema }), loginWithInvite);

export default router;
