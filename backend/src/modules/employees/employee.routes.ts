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
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  EmployeeIdBodySchema,
  EmployeeIdParamSchema,
  EmployeeVectorsSchema,
  MapDepartmentSchema,
  UpdateEmployeeNameSchema,
} from "./employee.schema";

const router = Router();

// Staff endpoints (ADMIN or AGENT)
router.get("/all-active", authenticateJwt, requireRole("ADMIN", "AGENT"), getAllActiveEmployees);
router.get("/my-assignments/:employeeId", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ params: EmployeeIdParamSchema }), getMyAssignments);

// Admin-only employee administration
router.get("/all-deleted", authenticateJwt, requireRole("ADMIN"), getAllDeletedEmployees);
router.patch("/delete", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: EmployeeIdBodySchema }), deleteEmployee);
router.patch("/restore", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: EmployeeIdBodySchema }), restoreEmployee);
router.patch("/map-department", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: MapDepartmentSchema }), mapEmployeeToDepartment);
router.post("/vectors", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: EmployeeVectorsSchema }), createEmployeeVectors);
router.patch("/update-name", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: UpdateEmployeeNameSchema }), updateEmployeeName);

export default router;
