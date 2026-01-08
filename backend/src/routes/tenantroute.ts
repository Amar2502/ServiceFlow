import { Router } from "express";
import { getTenantDetailsForML, updateTenant } from "../controllers/tenant";
import { adminmiddleware } from "../middlewares/adminmiddleware";

const router = Router();

router.put("/update", adminmiddleware, updateTenant);
router.post("/details-for-ml", getTenantDetailsForML);

export default router;