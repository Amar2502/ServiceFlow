import { Router } from "express";
import { login, register } from "./auth.controller";
import { validateRequest } from "../../middlewares/validate.middleware";
import { LoginSchema, RegisterSchema } from "./auth.schema";

const router = Router();

router.post("/register", validateRequest({ body: RegisterSchema }), register);
router.post("/login", validateRequest({ body: LoginSchema }), login);

export default router;
