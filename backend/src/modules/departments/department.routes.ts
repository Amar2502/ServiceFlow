import { Router } from "express";
import {
  createDepartment,
  deleteDepartment,
  getAllDeletedDepartments,
  getAllDepartments,
  restoreDepartment,
} from "./department.controller";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { CreateDepartmentSchema, DepartmentIdBodySchema } from "./department.schema";

const router = Router();

// Read departments (ADMIN or AGENT)
router.get("/all", authenticateJwt, requireRole("ADMIN", "AGENT"), getAllDepartments);

// Admin-only department management
router.post("/create", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: CreateDepartmentSchema }), createDepartment);
router.get("/deleted", authenticateJwt, requireRole("ADMIN"), getAllDeletedDepartments);
router.patch("/delete", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: DepartmentIdBodySchema }), deleteDepartment);
router.patch("/restore", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: DepartmentIdBodySchema }), restoreDepartment);

export default router;
