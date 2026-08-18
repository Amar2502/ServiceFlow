import { Router } from "express";
import {
  createEmployeeVectors,
  deleteEmployee,
  getAllActiveEmployees,
  getAllDeletedEmployees,
  getMyAssignments,
  mapEmployeeToDepartment,
  restoreEmployee,
  updateEmployeeName,
} from "./employee.controller";
import { adminmiddleware } from "../../middlewares/adminmiddleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  EmployeeIdBodySchema,
  EmployeeIdParamSchema,
  EmployeeVectorsSchema,
  MapDepartmentSchema,
  UpdateEmployeeNameSchema,
} from "./employee.schema";

const router = Router();

router.get("/all-active", adminmiddleware, getAllActiveEmployees);
router.get("/all-deleted", adminmiddleware, getAllDeletedEmployees);
router.patch("/delete", adminmiddleware, validateRequest({ body: EmployeeIdBodySchema }), deleteEmployee);
router.patch("/restore", adminmiddleware, validateRequest({ body: EmployeeIdBodySchema }), restoreEmployee);
router.patch("/map-department", adminmiddleware, validateRequest({ body: MapDepartmentSchema }), mapEmployeeToDepartment);
router.post("/vectors", adminmiddleware, validateRequest({ body: EmployeeVectorsSchema }), createEmployeeVectors);
router.patch("/update-name", adminmiddleware, validateRequest({ body: UpdateEmployeeNameSchema }), updateEmployeeName);
router.get("/my-assignments/:employeeId", adminmiddleware, validateRequest({ params: EmployeeIdParamSchema }), getMyAssignments);

export default router;
