import { Router } from "express";
import { generateApiKey } from "../controllers/apikey";

const router = Router();

router.post("/generate", generateApiKey);

export default router;