import { Prisma, PrismaClient } from "../../generated/prisma";
import { EmployeesSocket } from "../employees/employees.socket";

export class WorkloadService {
  /**
   * Recalculates and updates the exact active load counter for an employee to prevent counter drift.
   * Real-time Active Load = COUNT(assignments where complaint.status IN ('open', 'in_progress') AND complaint.deletedAt IS NULL)
   */
  static async syncEmployeeLoad(
    tx: Prisma.TransactionClient | PrismaClient,
    employeeId: string
  ): Promise<number> {
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

    if (employee?.tenantId) {
      EmployeesSocket.emitLoadUpdated(employee.tenantId, {
        employeeId,
        load: activeCount,
      });
    }

    return activeCount;
  }

  /**
   * Syncs load for all employees associated with a complaint (e.g. after status change or soft delete/restore)
   */
  static async syncComplaintEmployeeLoads(
    tx: Prisma.TransactionClient | PrismaClient,
    complaintId: string
  ): Promise<void> {
    const assignments = await tx.assignment.findMany({
      where: { complaintId },
      select: { employeeId: true },
    });

    for (const a of assignments) {
      if (a.employeeId) {
        await this.syncEmployeeLoad(tx, a.employeeId);
      }
    }
  }

  /**
   * Dynamic Workload Balancer Algorithm:
   * Selects the active employee in the department with the lowest REAL-TIME active ticket count.
   */
  static async selectLeastLoadedEmployee(
    tx: Prisma.TransactionClient,
    tenantId: string,
    departmentId: string
  ) {
    const employees = await tx.employee.findMany({
      where: {
        tenantId,
        departmentId,
        deletedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (employees.length === 0) {
      return null;
    }

    // Calculate real-time active load per employee
    const employeesWithLoad = await Promise.all(
      employees.map(async (emp) => {
        const activeCount = await tx.assignment.count({
          where: {
            employeeId: emp.id,
            complaint: {
              status: { in: ["open", "in_progress"] },
              deletedAt: null,
            },
          },
        });
        return { employee: emp, activeLoad: activeCount };
      })
    );

    // Sort ascending by real-time active load
    employeesWithLoad.sort((a, b) => a.activeLoad - b.activeLoad);
    const selected = employeesWithLoad[0];

    // Update load counter with new ticket
    await tx.employee.update({
      where: { id: selected.employee.id },
      data: { load: selected.activeLoad + 1 },
    });

    return selected.employee;
  }

  /**
   * Graceful unassigned department handler:
   * If no active employees exist in a Groq-predicted department, auto-assign to Tenant Admin
   * or place in UNASSIGNED_QUEUE with an alert.
   */
  static async handleUnassignedDepartmentState(
    tx: Prisma.TransactionClient,
    tenantId: string,
    departmentId: string,
    complaintId: string
  ) {
    // 1. Try finding a Tenant Admin
    const adminUser = await tx.user.findFirst({
      where: {
        tenantId,
        role: "ADMIN",
      },
      include: {
        employees: true,
      },
    });

    const adminEmployee = adminUser?.employees[0] || null;

    if (adminEmployee) {
      await tx.assignment.create({
        data: {
          tenantId,
          complaintId,
          assigneeType: "EMPLOYEE",
          employeeId: adminEmployee.id,
          departmentId,
        },
      });

      await this.syncEmployeeLoad(tx, adminEmployee.id);

      return {
        assignee_type: "EMPLOYEE",
        assigned_to: "TENANT_ADMIN",
        employee_id: adminEmployee.id,
        employee_name: adminUser?.name || adminEmployee.name || "Tenant Admin",
        employee_email: adminUser?.email,
        department_id: departmentId,
        unassigned_alert: true,
        alert_reason: "No active agents found in Groq-predicted department. Auto-assigned to Tenant Admin.",
      };
    }

    // 2. Fallback to UNASSIGNED_QUEUE at department level
    await tx.assignment.create({
      data: {
        tenantId,
        complaintId,
        assigneeType: "DEPARTMENT",
        departmentId,
      },
    });

    return {
      assignee_type: "DEPARTMENT",
      assigned_to: "UNASSIGNED_QUEUE",
      department_id: departmentId,
      unassigned_alert: true,
      alert_reason: "No active agents or admin found. Placed in Department Unassigned Queue with an alert.",
    };
  }
}
