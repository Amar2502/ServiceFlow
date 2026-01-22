import { Router } from "express";
import { deleteEmployee, getAllActiveEmployees, getAllDeletedEmployees, mapEmployeeToDepartment, restoreEmployee, createEmployeeVectors, updateEmployeeName } from "../controllers/employee";
import { adminmiddleware } from "../middlewares/adminmiddleware";
import { authmiddleware } from "../middlewares/auth";

const router = Router();

router.get("/active", adminmiddleware, getAllActiveEmployees);
router.get("/deleted", adminmiddleware, getAllDeletedEmployees);
router.patch("/delete", adminmiddleware, deleteEmployee);
router.patch("/restore", adminmiddleware, restoreEmployee);
router.patch("/map-to-department", adminmiddleware, mapEmployeeToDepartment);
router.post("/create-vectors", adminmiddleware, createEmployeeVectors);
router.patch("/update-name", authmiddleware, updateEmployeeName);

export default router;