import { Router } from "express";
import { deleteApiKey, generateApiKey, getApiKeys } from "../controllers/apikey";
import { adminmiddleware } from "../middlewares/adminmiddleware";

const router = Router();

router.post("/generate", adminmiddleware, generateApiKey);
router.delete("/delete", adminmiddleware, deleteApiKey);
router.get("/get", adminmiddleware, getApiKeys);

export default router;