import { Router } from "express";
import { createComplaint, getAllComplaints } from "../controllers/complaints";

const router = Router();

router.post("/create", createComplaint);

export default router;