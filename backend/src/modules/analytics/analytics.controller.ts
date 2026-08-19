import { Request, Response } from "express";
import { db } from "../../config/db";
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
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized context" });
  }

  if (!complaintId) {
    return res.status(400).json({ message: "complaintId is required" });
  }

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      select: { tenantId: true },
    });

    if (!complaint || complaint.tenantId !== tenantId) {
      return res.status(403).json({ message: "Forbidden: Access to specified complaint is denied" });
    }

    if (correctedDepartmentId) {
      const targetDept = await db.department.findUnique({
        where: { id: correctedDepartmentId },
        select: { tenantId: true },
      });

      if (!targetDept || targetDept.tenantId !== tenantId) {
        return res.status(400).json({ message: "Invalid department for current tenant context" });
      }
    }

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
