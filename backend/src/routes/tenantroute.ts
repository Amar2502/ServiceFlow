import { Router } from "express";
import { updateTenant } from "../controllers/tenant";
import { adminmiddleware } from "../middlewares/adminmiddleware";

const router = Router();

router.put("/update", adminmiddleware, updateTenant);

export default router;