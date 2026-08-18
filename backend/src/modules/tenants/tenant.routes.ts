import { Router } from "express";
import { updateTenantName, updateTenantRoutingMode } from "./tenant.controller";
import { adminmiddleware } from "../../middlewares/adminmiddleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { UpdateTenantNameSchema, UpdateTenantRoutingModeSchema } from "./tenant.schema";

const router = Router();

router.patch("/update-name", adminmiddleware, validateRequest({ body: UpdateTenantNameSchema }), updateTenantName);
router.patch("/update-routing-mode", adminmiddleware, validateRequest({ body: UpdateTenantRoutingModeSchema }), updateTenantRoutingMode);

export default router;
