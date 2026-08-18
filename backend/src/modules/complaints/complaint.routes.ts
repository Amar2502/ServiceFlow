import { Router } from "express";
import {
  assignComplaintToDepartment,
  assignComplaintToEmployee,
  createComplaint,
  deleteComplaint,
  getAllComplaints,
  getComplaintDetails,
  restoreComplaint,
  updateComplaintStatus,
} from "./complaint.controller";
import { adminmiddleware } from "../../middlewares/adminmiddleware";
import { apiKeyAuth } from "../../middlewares/apikeymiddleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  AssignDepartmentSchema,
  AssignEmployeeSchema,
  ComplaintIdBodySchema,
  ComplaintIdParamSchema,
  CreateComplaintSchema,
  UpdateComplaintStatusSchema,
} from "./complaint.schema";

const router = Router();

router.get("/all", adminmiddleware, getAllComplaints);
router.post("/create", apiKeyAuth, validateRequest({ body: CreateComplaintSchema }), createComplaint);
router.patch("/update-status", adminmiddleware, validateRequest({ body: UpdateComplaintStatusSchema }), updateComplaintStatus);
router.patch("/delete", adminmiddleware, validateRequest({ body: ComplaintIdBodySchema }), deleteComplaint);
router.patch("/restore", adminmiddleware, validateRequest({ body: ComplaintIdBodySchema }), restoreComplaint);
router.get("/details/:complaintId", apiKeyAuth, validateRequest({ params: ComplaintIdParamSchema }), getComplaintDetails);
router.patch("/assign-to-employee", adminmiddleware, validateRequest({ body: AssignEmployeeSchema }), assignComplaintToEmployee);
router.patch("/assign-to-department", adminmiddleware, validateRequest({ body: AssignDepartmentSchema }), assignComplaintToDepartment);

export default router;
