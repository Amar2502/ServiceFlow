import { Router } from "express";
import { getAllComplaints } from "../controllers/complaints";

const router = Router();

router.get("/all", getAllComplaints);

export default router;