import { Router } from "express";
import { adminmiddleware } from "../middlewares/adminmiddleware";
import { createDepartment, getAllDepartments, getAllDeletedDepartments, deleteDepartment, restoreDepartment, createDepartmentVectors } from "../controllers/department";

const router = Router();

router.post("/create", adminmiddleware, createDepartment);
router.get("/all", adminmiddleware, getAllDepartments);
router.get("/deleted", adminmiddleware, getAllDeletedDepartments);
router.patch("/delete", adminmiddleware, deleteDepartment);
router.patch("/restore", adminmiddleware, restoreDepartment);
router.post("/create-vectors", adminmiddleware, createDepartmentVectors);

export default router;