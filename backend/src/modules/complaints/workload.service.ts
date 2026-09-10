import { Prisma, PrismaClient } from "../../generated/prisma";
import { EmployeesSocket } from "../employees/employees.socket";

export interface SyncLoadResult {
  employeeId: string;
  tenantId: string | null;
  load: number;
}

export class WorkloadService {
  /**
   * Recalculates and updates the exact active load counter for an employee to prevent counter drift.
   * Real-time Active Load = COUNT(assignments where complaint.status IN ('open', 'in_progress') AND complaint.deletedAt IS NULL)
   */
  static async syncEmployeeLoad(
    tx: Prisma.TransactionClient | PrismaClient,
    employeeId: string,
    emitSocketImmediately = false
  ): Promise<SyncLoadResult> {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true },
    });

    const activeCount = await tx.assignment.count({
      where: {
        employeeId,
        complaint: {
          status: { in: ["open", "in_progress"] },
          deletedAt: null,
        },
      },
    });

    await tx.employee.update({
      where: { id: employeeId },
      data: { load: activeCount },
    });

    const result: SyncLoadResult = {
      employeeId,
      tenantId: employee?.tenantId || null,
      load: activeCount,
    };

    if (emitSocketImmediately && result.tenantId) {
      EmployeesSocket.emitLoadUpdated(result.tenantId, {
        employeeId,
        load: activeCount,
      });
    }

    return result;
  }

  /**
   * Safely broadcasts load updates over WebSockets after the database transaction has successfully committed.
   */
  static emitLoadUpdates(loads: (SyncLoadResult | null | undefined)[]): void {
    for (const item of loads) {
      if (item && item.tenantId) {
        EmployeesSocket.emitLoadUpdated(item.tenantId, {
          employeeId: item.employeeId,
          load: item.load,
        });
      }
    }
  }

  /**
   * Syncs load for all employees associated with a complaint (e.g. after status change, assignment, or soft delete/restore).
   */
  static async syncComplaintEmployeeLoads(
    tx: Prisma.TransactionClient | PrismaClient,
    complaintId: string,
    emitSocketImmediately = false
  ): Promise<SyncLoadResult[]> {
    const assignments = await tx.assignment.findMany({
      where: { complaintId },
      select: { employeeId: true },
    });

    const results: SyncLoadResult[] = [];
    for (const a of assignments) {
      if (a.employeeId) {
        const res = await this.syncEmployeeLoad(tx, a.employeeId, emitSocketImmediately);
        results.push(res);
      }
    }
    return results;
  }

  /**
   * Dynamic Workload Balancer Algorithm:
   * Selects the active employee in the target department with the lowest active load.
   * Single fast indexed query: O(1) database trip leveraging the persisted `Employee.load` counter.
   * Eliminates the N+1 query bottleneck.
   */
  static async selectLeastLoadedEmployee(
    tx: Prisma.TransactionClient | PrismaClient,
    tenantId: string,
    departmentId: string
  ) {
    const leastLoaded = await tx.employee.findFirst({
      where: {
        tenantId,
        departmentId,
        deletedAt: null,
      },
      orderBy: {
        load: "asc",
      },
      include: {
        user: true,
        department: true,
      },
    });

    return leastLoaded || null;
  }

  /**
   * Graceful unassigned department handler:
   * If no active employees exist in a Groq-predicted department, auto-assign to Tenant Admin
   * or place in UNASSIGNED_QUEUE with an alert.
   */
  static async handleUnassignedDepartmentState(
    tx: Prisma.TransactionClient,
    tenantId: string,
    departmentId: string | null | undefined,
    complaintId: string
  ) {
    // Validate departmentId exists in DB for this tenant to prevent foreign key errors (P2003)
    let validDepartmentId: string | null = null;
    if (departmentId && departmentId !== "00000000-0000-0000-0000-000000000000") {
      const dept = await tx.department.findFirst({
        where: { id: departmentId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (dept) validDepartmentId = dept.id;
    }

    if (!validDepartmentId) {
      const fallbackDept = await tx.department.findFirst({
        where: { tenantId, deletedAt: null },
        select: { id: true },
      });
      if (fallbackDept) validDepartmentId = fallbackDept.id;
    }

    // 1. Try finding a Tenant Admin
    const adminUser = await tx.user.findFirst({
      where: {
        tenantId,
        role: "ADMIN",
      },
      include: {
        employees: {
          where: { deletedAt: null },
        },
      },
    });

    let adminEmployee = adminUser?.employees[0] || null;

    if (adminUser && !adminEmployee) {
      adminEmployee = await tx.employee.create({
        data: {
          tenantId,
          userId: adminUser.id,
          name: adminUser.name || "Tenant Admin",
          title: "Tenant Administrator",
        },
      });
    }

    const oldAssignments = await tx.assignment.findMany({
      where: { complaintId },
      select: { employeeId: true },
    });

    if (adminEmployee) {
      await tx.assignment.upsert({
        where: { complaintId },
        create: {
          tenantId,
          complaintId,
          assigneeType: "EMPLOYEE",
          employeeId: adminEmployee.id,
          departmentId: validDepartmentId,
        },
        update: {
          assigneeType: "EMPLOYEE",
          employeeId: adminEmployee.id,
          departmentId: validDepartmentId,
          assignedAt: new Date(),
        },
      });

      for (const old of oldAssignments) {
        if (old.employeeId && old.employeeId !== adminEmployee.id) {
          await this.syncEmployeeLoad(tx, old.employeeId);
        }
      }
      await this.syncEmployeeLoad(tx, adminEmployee.id);

      return {
        assignee_type: "EMPLOYEE",
        assigned_to: "TENANT_ADMIN",
        employee_id: adminEmployee.id,
        employee_name: adminUser?.name || adminEmployee.name || "Tenant Admin",
        employee_email: adminUser?.email,
        department_id: validDepartmentId,
        unassigned_alert: true,
        alert_reason: "Escalated: Auto-assigned to Tenant Admin.",
      };
    }

    // 2. Fallback to UNASSIGNED_QUEUE
    await tx.assignment.upsert({
      where: { complaintId },
      create: {
        tenantId,
        complaintId,
        assigneeType: "DEPARTMENT",
        departmentId: validDepartmentId,
        employeeId: null,
      },
      update: {
        assigneeType: "DEPARTMENT",
        departmentId: validDepartmentId,
        employeeId: null,
        assignedAt: new Date(),
      },
    });

    for (const old of oldAssignments) {
      if (old.employeeId) {
        await this.syncEmployeeLoad(tx, old.employeeId);
      }
    }

    return {
      assignee_type: "DEPARTMENT",
      assigned_to: "UNASSIGNED_QUEUE",
      department_id: validDepartmentId,
      unassigned_alert: true,
      alert_reason: "Escalated: Placed in Unassigned Queue with an alert.",
    };
  }
}

