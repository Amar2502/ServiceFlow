import { Router } from "express";
import { updateTenantName, updateTenantRoutingMode, getTenantDetails } from "./tenant.controller";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { UpdateTenantNameSchema, UpdateTenantRoutingModeSchema } from "./tenant.schema";

const router = Router();

router.get("/me", authenticateJwt, getTenantDetails);

// Tenant configuration changes are restricted to ADMIN users
router.patch("/update-name", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: UpdateTenantNameSchema }), updateTenantName);
router.patch("/update-routing-mode", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: UpdateTenantRoutingModeSchema }), updateTenantRoutingMode);

export default router;
