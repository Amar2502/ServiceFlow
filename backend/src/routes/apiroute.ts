import { Router } from "express";
import { deleteApiKey, generateApiKey } from "../controllers/apikey";
import { adminmiddleware } from "../middlewares/adminmiddleware";

const router = Router();

router.post("/generate", adminmiddleware, generateApiKey);
router.delete("/delete", adminmiddleware, deleteApiKey);

export default router;