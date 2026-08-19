import { Router } from "express";
import { deleteApiKey, generateApiKey, getApiKeys } from "./apikey.controller";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { DeleteApiKeySchema, GenerateApiKeySchema } from "./apikey.schema";

const router = Router();

// API Key management is restricted strictly to ADMIN users
router.post("/generate", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: GenerateApiKeySchema }), generateApiKey);
router.patch("/delete", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: DeleteApiKeySchema }), deleteApiKey);
router.get("/all", authenticateJwt, requireRole("ADMIN"), getApiKeys);

export default router;
