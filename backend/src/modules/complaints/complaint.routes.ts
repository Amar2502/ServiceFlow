import { Router } from "express";
import {
  assignComplaintToDepartment,
  assignComplaintToEmployee,
  createComplaint,
  deleteComplaint,
  getAllComplaints,
  getComplaintDetails,
  restoreComplaint,
  sendResolutionEmailController,
  updateComplaintStatus,
} from "./complaint.controller";
import { apiKeyAuth } from "../../middlewares/apikeymiddleware";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  AssignDepartmentSchema,
  AssignEmployeeSchema,
  ComplaintIdBodySchema,
  ComplaintIdParamSchema,
  CreateComplaintSchema,
  SendResolutionEmailSchema,
  UpdateComplaintStatusSchema,
} from "./complaint.schema";

const router = Router();

// Public / API Key ingestion endpoint
router.post("/create", apiKeyAuth, validateRequest({ body: CreateComplaintSchema }), createComplaint);

// Staff endpoints (ADMIN and AGENT)
router.get("/all", authenticateJwt, requireRole("ADMIN", "AGENT"), getAllComplaints);
router.get("/details/:complaintId", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ params: ComplaintIdParamSchema }), getComplaintDetails);
router.post("/send-resolution-email", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ body: SendResolutionEmailSchema }), sendResolutionEmailController);
router.patch("/update-status", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ body: UpdateComplaintStatusSchema }), updateComplaintStatus);
router.patch("/assign-to-employee", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ body: AssignEmployeeSchema }), assignComplaintToEmployee);
router.patch("/assign-to-department", authenticateJwt, requireRole("ADMIN", "AGENT"), validateRequest({ body: AssignDepartmentSchema }), assignComplaintToDepartment);

// Admin-only management endpoints
router.patch("/delete", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: ComplaintIdBodySchema }), deleteComplaint);
router.patch("/restore", authenticateJwt, requireRole("ADMIN"), validateRequest({ body: ComplaintIdBodySchema }), restoreComplaint);

export default router;
