import { db } from "../../config/db";
import { Priority, Prisma } from "../../generated/prisma";
import { WorkloadService } from "../complaints/workload.service";
import { SlaSocket } from "./sla.socket";

export interface SlaEscalationResult {
  breachedCount: number;
  escalatedComplaints: {
    id: string;
    title: string;
    priority: Priority;
    slaDueAt: Date | null;
    escalatedTo: string;
  }[];
}

export class SlaService {
  /**
   * Calculates the exact SLA due timestamp based on ticket priority:
   * - URGENT :  2 Hours
   * - HIGH   :  6 Hours
   * - MEDIUM : 24 Hours
   * - LOW    : 48 Hours
   */
  static calculateSlaDueAt(priority: Priority | string, createdAt = new Date()): Date {
    const hoursMap: Record<string, number> = {
      URGENT: 2,
      HIGH: 6,
      MEDIUM: 24,
      LOW: 48,
    };

    const hours = hoursMap[String(priority).toUpperCase()] || 24;
    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Scans for open/in_progress tickets that breached SLA deadlines (slaDueAt <= NOW()),
   * marks them as breached, escalates priority to URGENT, and reassigns to Tenant Admin.
   */
  static async checkAndEscalateBreachedSlas(): Promise<SlaEscalationResult> {
    const now = new Date();

    try {
      const breachedComplaints = await db.complaint.findMany({
        where: {
          status: { in: ["open", "in_progress"] },
          deletedAt: null,
          isSlaBreached: false,
          slaDueAt: {
            lte: now,
          },
        },
        include: {
          tenant: true,
          assignments: true,
        },
      });

      if (breachedComplaints.length === 0) {
        return { breachedCount: 0, escalatedComplaints: [] };
      }

      console.log(`[SLA Escalation Engine] Found ${breachedComplaints.length} ticket(s) breaching SLA deadlines.`);

      const escalatedList = [];

      for (const complaint of breachedComplaints) {
        const result = await db.$transaction(async (tx) => {
          // 1. Mark ticket as SLA breached & elevate priority to URGENT
          const updatedComplaint = await tx.complaint.update({
            where: { id: complaint.id },
            data: {
              isSlaBreached: true,
              priority: "URGENT",
            },
          });

          // 2. Escalate assignment to Tenant Admin
          const escalationDetails = await WorkloadService.handleUnassignedDepartmentState(
            tx,
            complaint.tenantId,
            complaint.assignments[0]?.departmentId || "00000000-0000-0000-0000-000000000000",
            complaint.id
          );

          return {
            id: updatedComplaint.id,
            title: updatedComplaint.title,
            priority: updatedComplaint.priority,
            slaDueAt: updatedComplaint.slaDueAt,
            escalatedTo: escalationDetails.assigned_to,
          };
        });

        escalatedList.push(result);
      }

      // Group and emit real-time SLA breach events per tenant
      const tenantBreaches = new Map<string, any[]>();
      for (const complaint of breachedComplaints) {
        const list = tenantBreaches.get(complaint.tenantId) || [];
        list.push(complaint.id);
        tenantBreaches.set(complaint.tenantId, list);
      }

      for (const [tenantId, ticketIds] of tenantBreaches.entries()) {
        SlaSocket.emitSlaBreached(tenantId, {
          breachedCount: ticketIds.length,
          ticketIds,
          timestamp: now,
        });
      }

      return {
        breachedCount: escalatedList.length,
        escalatedComplaints: escalatedList,
      };
    } catch (error) {
      console.error("[SLA Escalation Engine Error] Failed checking breached SLAs:", error);
      throw error;
    }
  }
}
