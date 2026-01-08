import { Router } from "express";
import { getAllEmployees } from "../controllers/employee";

const router = Router();

router.get("/all", getAllEmployees);

export default router;