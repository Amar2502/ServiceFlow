import { Router } from "express";
import { getAnalyticsOverview, submitAiFeedbackController } from "./analytics.controller";
import { authenticateJwt, requireRole } from "../../middlewares/role.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { SubmitAiFeedbackSchema } from "./analytics.schema";

const router = Router();

// Analytics overview endpoint (ADMIN or AGENT)
router.get("/overview", authenticateJwt, requireRole("ADMIN", "AGENT"), getAnalyticsOverview);

// Groq AI Accuracy Agent Feedback Toggle endpoint (ADMIN or AGENT)
router.post(
  "/ai-feedback",
  authenticateJwt,
  requireRole("ADMIN", "AGENT"),
  validateRequest({ body: SubmitAiFeedbackSchema }),
  submitAiFeedbackController
);

export default router;
