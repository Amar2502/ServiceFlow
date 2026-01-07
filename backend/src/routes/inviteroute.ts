import { Router } from "express";
import { createInvite, loginWithInvite } from "../controllers/invites";

const router = Router();

router.post("/create", createInvite);
router.post("/login", loginWithInvite);

export default router;