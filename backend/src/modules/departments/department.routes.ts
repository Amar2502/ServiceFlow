import { Router } from "express";
import {
  createDepartment,
  deleteDepartment,
  getAllDeletedDepartments,
  getAllDepartments,
  restoreDepartment,
} from "./department.controller";
import { adminmiddleware } from "../../middlewares/adminmiddleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { CreateDepartmentSchema, DepartmentIdBodySchema } from "./department.schema";

const router = Router();

router.post("/create", adminmiddleware, validateRequest({ body: CreateDepartmentSchema }), createDepartment);
router.get("/all", adminmiddleware, getAllDepartments);
router.get("/deleted", adminmiddleware, getAllDeletedDepartments);
router.patch("/delete", adminmiddleware, validateRequest({ body: DepartmentIdBodySchema }), deleteDepartment);
router.patch("/restore", adminmiddleware, validateRequest({ body: DepartmentIdBodySchema }), restoreDepartment);

export default router;
