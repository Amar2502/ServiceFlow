import { Router } from "express";
import { deleteApiKey, generateApiKey, getApiKeys } from "./apikey.controller";
import { adminmiddleware } from "../../middlewares/adminmiddleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { DeleteApiKeySchema, GenerateApiKeySchema } from "./apikey.schema";

const router = Router();

router.post("/generate", adminmiddleware, validateRequest({ body: GenerateApiKeySchema }), generateApiKey);
router.patch("/delete", adminmiddleware, validateRequest({ body: DeleteApiKeySchema }), deleteApiKey);
router.get("/all", adminmiddleware, getApiKeys);

export default router;
