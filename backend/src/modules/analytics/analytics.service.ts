import { db } from "../../config/db";

export class AnalyticsService {
  /**
   * Calculate comprehensive service metrics using native PostgreSQL SQL aggregation queries.
   * Eliminates in-memory array processing and scales efficiently to millions of records.
   */
  static async getOverviewMetrics(tenantId: string) {
    // 1. High-Performance Native SQL Aggregation for Summary Metrics
    const summaryRows = await db.$queryRaw<
      Array<{
        total_complaints: number;
        open_complaints: number;
        resolved_complaints: number;
        breached_complaints: number;
        overall_mttr_hours: number;
        sla_compliance_rate: number;
        ai_accuracy_rate: number;
      }>
    >`
      SELECT
        COUNT(*)::int AS total_complaints,
        COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open_complaints,
        COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_complaints,
        COUNT(*) FILTER (
          WHERE is_sla_breached = true 
             OR (sla_due_at IS NOT NULL AND sla_due_at < NOW() AND status != 'resolved')
        )::int AS breached_complaints,
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at)) / 3600.0
            ) FILTER (WHERE status = 'resolved' AND COALESCE(resolved_at, updated_at) >= created_at)::numeric,
            1
          ),
          0
        )::float AS overall_mttr_hours,
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (
                WHERE status = 'resolved' 
                  AND is_sla_breached = false 
                  AND (sla_due_at IS NULL OR COALESCE(resolved_at, updated_at) <= sla_due_at)
              ) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE status = 'resolved'), 0)
            )::numeric,
            1
          ),
          100
        )::float AS sla_compliance_rate,
        COALESCE(
          ROUND(
            (
              COUNT(*) FILTER (WHERE is_correctly_classified = true) * 100.0 / NULLIF(COUNT(*), 0)
            )::numeric,
            1
          ),
          100
        )::float AS ai_accuracy_rate
      FROM complaints
      WHERE tenant_id = ${tenantId}::uuid AND deleted_at IS NULL;
    `;

    const summary = summaryRows[0] || {
      total_complaints: 0,
      open_complaints: 0,
      resolved_complaints: 0,
      breached_complaints: 0,
      overall_mttr_hours: 0,
      sla_compliance_rate: 100,
      ai_accuracy_rate: 100,
    };

    // 2. MTTR Breakdown by Priority (Native PostgreSQL GROUP BY)
    const priorityRows = await db.$queryRaw<
      Array<{
        priority: string;
        count: number;
        avg_hours: number;
      }>
    >`
      SELECT
        priority::text AS priority,
        COUNT(*)::int AS count,
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at)) / 3600.0
            ) FILTER (WHERE COALESCE(resolved_at, updated_at) >= created_at)::numeric,
            1
          ),
          0
        )::float AS avg_hours
      FROM complaints
      WHERE tenant_id = ${tenantId}::uuid 
        AND status = 'resolved' 
        AND deleted_at IS NULL
      GROUP BY priority;
    `;

    const priorityMap: Record<string, { avgHours: number; count: number }> = {
      URGENT: { avgHours: 0, count: 0 },
      HIGH: { avgHours: 0, count: 0 },
      MEDIUM: { avgHours: 0, count: 0 },
      LOW: { avgHours: 0, count: 0 },
    };

    for (const row of priorityRows) {
      if (priorityMap[row.priority]) {
        priorityMap[row.priority] = {
          avgHours: Number(row.avg_hours) || 0,
          count: Number(row.count) || 0,
        };
      }
    }

    const mttrByPriority = Object.entries(priorityMap).map(([priority, val]) => ({
      priority,
      avgHours: val.avgHours,
      count: val.count,
    }));

    // 3. MTTR Breakdown by Department (Native PostgreSQL JOIN & GROUP BY)
    const departmentRows = await db.$queryRaw<
      Array<{
        department: string;
        count: number;
        avg_hours: number;
      }>
    >`
      SELECT
        COALESCE(d.name, 'General Routing') AS department,
        COUNT(c.id)::int AS count,
        COALESCE(
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (COALESCE(c.resolved_at, c.updated_at) - c.created_at)) / 3600.0
            ) FILTER (WHERE COALESCE(c.resolved_at, c.updated_at) >= c.created_at)::numeric,
            1
          ),
          0
        )::float AS avg_hours
      FROM complaints c
      LEFT JOIN assignments a ON a.complaint_id = c.id
      LEFT JOIN departments d ON d.id = a.department_id
      WHERE c.tenant_id = ${tenantId}::uuid 
        AND c.status = 'resolved' 
        AND c.deleted_at IS NULL
      GROUP BY COALESCE(d.name, 'General Routing')
      ORDER BY count DESC;
    `;

    const mttrByDepartment = departmentRows.map((row) => ({
      department: row.department,
      avgHours: Number(row.avg_hours) || 0,
      count: Number(row.count) || 0,
    }));

    return {
      summary: {
        totalComplaints: Number(summary.total_complaints) || 0,
        openComplaints: Number(summary.open_complaints) || 0,
        resolvedComplaints: Number(summary.resolved_complaints) || 0,
        breachedComplaints: Number(summary.breached_complaints) || 0,
        overallMttrHours: Number(summary.overall_mttr_hours) || 0,
        slaComplianceRate: Number(summary.sla_compliance_rate) || 100,
        aiAccuracyRate: Number(summary.ai_accuracy_rate) || 100,
      },
      mttrByPriority,
      mttrByDepartment,
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

