import { Router } from "express";
import { assignComplaintToDepartment, assignComplaintToEmployee, createComplaint, deleteComplaint, getAllComplaints, getComplaintDetails, restoreComplaint, updateComplaintStatus } from "../controllers/complaints";
import { adminmiddleware } from "../middlewares/adminmiddleware";
import { apiKeyAuth } from "../middlewares/apikeymiddleware";

const router = Router();

router.get("/all", adminmiddleware, getAllComplaints);
router.post("/create", apiKeyAuth, createComplaint);
router.patch("/update-status", adminmiddleware, updateComplaintStatus);
router.patch("/delete", adminmiddleware, deleteComplaint);
router.patch("/restore", adminmiddleware, restoreComplaint);
router.get("/details/:complaintId", apiKeyAuth, getComplaintDetails);
router.patch("/assign-to-employee", adminmiddleware, assignComplaintToEmployee);
router.patch("/assign-to-department", adminmiddleware, assignComplaintToDepartment);

export default router;