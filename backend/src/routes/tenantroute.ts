import { Router } from "express";
import { updateTenantName, updateTenantRoutingMode } from "../controllers/tenant";
import { adminmiddleware } from "../middlewares/adminmiddleware";

const router = Router();

router.put("/update/name", adminmiddleware, updateTenantName);
router.put("/update/routing-mode", adminmiddleware, updateTenantRoutingMode);

export default router;