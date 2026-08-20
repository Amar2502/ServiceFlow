import { Router } from "express";
import { login, register, getMeController } from "./auth.controller";
import { validateRequest } from "../../middlewares/validate.middleware";
import { authenticateJwt } from "../../middlewares/role.middleware";
import { LoginSchema, RegisterSchema } from "./auth.schema";

const router = Router();

router.post("/register", validateRequest({ body: RegisterSchema }), register);
router.post("/login", validateRequest({ body: LoginSchema }), login);
router.get("/me", authenticateJwt, getMeController);

export default router;
