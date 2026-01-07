import e, { Router } from "express";
import { createComplaint } from "../controllers/complaints";

const router = Router();

router.post("/create", createComplaint);

export default router;