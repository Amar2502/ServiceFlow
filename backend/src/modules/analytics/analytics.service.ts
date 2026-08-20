import { db } from "../../config/db";

export class AnalyticsService {
  /**
   * Calculate comprehensive service metrics: MTTR, SLA Compliance Rate, and Groq AI Accuracy Rate
   */
  static async getOverviewMetrics(tenantId: string) {
    // 1. Fetch active complaints for the tenant
    const complaints = await db.complaint.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        assignments: {
          include: { department: true },
        },
      },
    });

    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter((c) => c.status === "resolved");
    const openComplaints = complaints.filter((c) => c.status === "open" || c.status === "in_progress");

    // 2. MTTR Calculation (Mean Time to Resolution in hours)
    let totalResolutionHours = 0;
    let resolvedCount = 0;

    resolvedComplaints.forEach((c) => {
      const endTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
      const startTime = new Date(c.createdAt).getTime();
      const diffHours = (endTime - startTime) / (1000 * 60 * 60);
      if (diffHours >= 0) {
        totalResolutionHours += diffHours;
        resolvedCount++;
      }
    });

    const overallMttrHours = resolvedCount > 0 ? Number((totalResolutionHours / resolvedCount).toFixed(1)) : 0;

    // MTTR Breakdown by Priority
    const mttrByPriority: Record<string, { totalHours: number; count: number; avgHours: number }> = {
      URGENT: { totalHours: 0, count: 0, avgHours: 0 },
      HIGH: { totalHours: 0, count: 0, avgHours: 0 },
      MEDIUM: { totalHours: 0, count: 0, avgHours: 0 },
      LOW: { totalHours: 0, count: 0, avgHours: 0 },
    };

    resolvedComplaints.forEach((c) => {
      const endTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
      const startTime = new Date(c.createdAt).getTime();
      const diffHours = (endTime - startTime) / (1000 * 60 * 60);
      const p = c.priority || "MEDIUM";

      if (mttrByPriority[p]) {
        mttrByPriority[p].totalHours += diffHours;
        mttrByPriority[p].count += 1;
      }
    });

    Object.keys(mttrByPriority).forEach((p) => {
      const item = mttrByPriority[p];
      item.avgHours = item.count > 0 ? Number((item.totalHours / item.count).toFixed(1)) : 0;
    });

    // MTTR Breakdown by Department
    const mttrByDepartment: Record<string, { name: string; totalHours: number; count: number; avgHours: number }> = {};

    resolvedComplaints.forEach((c) => {
      const deptName = c.assignments[0]?.department?.name || "General Routing";
      const endTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
      const startTime = new Date(c.createdAt).getTime();
      const diffHours = (endTime - startTime) / (1000 * 60 * 60);

      if (!mttrByDepartment[deptName]) {
        mttrByDepartment[deptName] = { name: deptName, totalHours: 0, count: 0, avgHours: 0 };
      }
      mttrByDepartment[deptName].totalHours += diffHours;
      mttrByDepartment[deptName].count += 1;
    });

    Object.keys(mttrByDepartment).forEach((dept) => {
      const item = mttrByDepartment[dept];
      item.avgHours = item.count > 0 ? Number((item.totalHours / item.count).toFixed(1)) : 0;
    });

    // 3. Real-Time SLA Compliance Rate (% of tickets resolved without breach)
    const breachedCount = complaints.filter(
      (c) => c.isSlaBreached || (c.slaDueAt && new Date(c.slaDueAt) < new Date() && c.status !== "resolved")
    ).length;
    const slaMetCount = resolvedComplaints.filter(
      (c) => !c.isSlaBreached && (!c.slaDueAt || new Date(c.resolvedAt || c.updatedAt) <= new Date(c.slaDueAt))
    ).length;
    const slaComplianceRate = resolvedComplaints.length > 0
      ? Number(((slaMetCount / resolvedComplaints.length) * 100).toFixed(1))
      : 100;

    // 4. Groq AI Classification Accuracy Feedback Rate
    const correctlyClassifiedCount = complaints.filter((c) => c.isCorrectlyClassified).length;
    const aiAccuracyRate = totalComplaints > 0
      ? Number(((correctlyClassifiedCount / totalComplaints) * 100).toFixed(1))
      : 100;

    return {
      summary: {
        totalComplaints,
        openComplaints: openComplaints.length,
        resolvedComplaints: resolvedComplaints.length,
        breachedComplaints: breachedCount,
        overallMttrHours,
        slaComplianceRate,
        aiAccuracyRate,
      },
      mttrByPriority: Object.entries(mttrByPriority).map(([priority, val]) => ({
        priority,
        avgHours: val.avgHours,
        count: val.count,
      })),
      mttrByDepartment: Object.values(mttrByDepartment).map((val) => ({
        department: val.name,
        avgHours: val.avgHours,
        count: val.count,
      })),
    };
  }

  /**
   * Log agent feedback for Groq AI classification accuracy
   */
  static async submitFeedback(complaintId: string, isCorrectlyClassified: boolean, correctedDepartmentId?: string) {
    const updated = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id: complaintId },
        data: { isCorrectlyClassified },
      });

      if (!isCorrectlyClassified && correctedDepartmentId) {
        // Re-assign to correct department if agent specified
        const existingAssignment = await tx.assignment.findFirst({
          where: { complaintId },
        });

        if (existingAssignment) {
          await tx.assignment.update({
            where: { id: existingAssignment.id },
            data: {
              assigneeType: "DEPARTMENT",
              departmentId: correctedDepartmentId,
              employeeId: null,
              assignedAt: new Date(),
            },
          });
        }
      }

      return complaint;
    });

    return updated;
  }
}
