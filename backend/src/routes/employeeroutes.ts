import { Router } from "express";
import { deleteEmployee, getAllActiveEmployees, getAllDeletedEmployees, mapEmployeeToDepartment, restoreEmployee } from "../controllers/employee";
import { adminmiddleware } from "../middlewares/adminmiddleware";

const router = Router();

router.get("/active", adminmiddleware, getAllActiveEmployees);
router.get("/deleted", adminmiddleware, getAllDeletedEmployees);
router.patch("/delete", adminmiddleware, deleteEmployee);
router.patch("/restore", adminmiddleware, restoreEmployee);
router.patch("/map-to-department", adminmiddleware, mapEmployeeToDepartment);

export default router;