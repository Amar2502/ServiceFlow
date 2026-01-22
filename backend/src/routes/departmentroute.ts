import { Router } from "express";
import { adminmiddleware } from "../middlewares/adminmiddleware";
import { createDepartment, getAllDepartments, getAllDeletedDepartments, deleteDepartment, restoreDepartment } from "../controllers/department";

const router = Router();

router.post("/create", adminmiddleware, createDepartment);
router.get("/all", adminmiddleware, getAllDepartments);
router.get("/deleted", adminmiddleware, getAllDeletedDepartments);
router.patch("/delete", adminmiddleware, deleteDepartment);
router.patch("/restore", adminmiddleware, restoreDepartment);
// Note: create-vectors endpoint removed - department vectors are automatically created when a department is created

export default router;