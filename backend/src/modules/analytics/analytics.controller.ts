import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service";

export const getAnalyticsOverview = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const metrics = await AnalyticsService.getOverviewMetrics(tenantId);
    return res.status(200).json(metrics);
  } catch (error) {
    console.error("[GetAnalyticsOverview Error]:", error);
    return res.status(500).json({ message: "Internal server error calculating analytics" });
  }
};

export const submitAiFeedbackController = async (req: Request, res: Response) => {
  const { complaintId, isCorrectlyClassified, correctedDepartmentId } = req.body;

  try {
    const updated = await AnalyticsService.submitFeedback(
      complaintId,
      Boolean(isCorrectlyClassified),
      correctedDepartmentId
    );

    return res.status(200).json({
      message: "AI classification accuracy feedback recorded successfully",
      complaintId: updated.id,
      isCorrectlyClassified: updated.isCorrectlyClassified,
    });
  } catch (error) {
    console.error("[SubmitAiFeedback Error]:", error);
    return res.status(500).json({ message: "Internal server error submitting AI feedback" });
  }
};
