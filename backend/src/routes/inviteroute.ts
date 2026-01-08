import { Router } from "express";
import { createInvite, loginWithInvite } from "../controllers/invites";
import { authmiddleware } from "../middlewares/auth";

const router = Router();

router.post("/create", authmiddleware, createInvite);
router.post("/login", loginWithInvite);

export default router;