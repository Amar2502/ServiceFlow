import { Router } from "express";
import { assignComplaintToAssigneeThroughML, createComplaint, deleteComplaint, getAllComplaints, restoreComplaint, updateComplaintStatus } from "../controllers/complaints";
import { adminmiddleware } from "../middlewares/adminmiddleware";
import { apiKeyAuth } from "../middlewares/apikeymiddleware";

const router = Router();

router.get("/all", adminmiddleware, getAllComplaints);
router.post("/create", apiKeyAuth, createComplaint);
router.patch("/update-status", adminmiddleware, updateComplaintStatus);
router.patch("/delete", adminmiddleware, deleteComplaint);
router.patch("/restore", adminmiddleware, restoreComplaint);
router.post("/assign-to-assignee-through-ml", adminmiddleware, assignComplaintToAssigneeThroughML);

export default router;