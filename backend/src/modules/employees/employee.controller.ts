import { Request, Response } from "express";
import { db } from "../../config/db";
import { config } from "../../config/config";
import { Prisma } from "../../generated/prisma";
import { WorkloadService } from "../complaints/workload.service";

export const getAllActiveEmployees = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    const employees = await db.employee.findMany({
      where: { tenantId, deletedAt: null },
      include: { user: true },
    });

    const formatted = employees.map((e) => ({
      id: e.id,
      tenant_id: e.tenantId,
      user_id: e.userId,
      department_id: e.departmentId,
      load: e.load,
      name: e.name && e.name.trim() !== "" ? e.name : e.user.name,
      title: e.title,
      keywords: e.keywords,
      vector: e.vector,
      created_at: e.createdAt,
      deleted_at: e.deletedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllDeletedEmployees = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    const employees = await db.employee.findMany({
      where: { tenantId, deletedAt: { not: null } },
      include: { user: true },
    });

    const formatted = employees.map((e) => ({
      id: e.id,
      tenant_id: e.tenantId,
      user_id: e.userId,
      department_id: e.departmentId,
      load: e.load,
      name: e.name && e.name.trim() !== "" ? e.name : e.user.name,
      title: e.title,
      keywords: e.keywords,
      vector: e.vector,
      created_at: e.createdAt,
      deleted_at: e.deletedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const { employeeId } = req.body as { employeeId: string };
  const tenantId = req.user?.tenantId;

  if (!employeeId || !tenantId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const existingEmp = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
    });

    if (!existingEmp) {
      res.status(404).json({ message: "Employee profile not found" });
      return;
    }

    await db.$transaction(async (tx) => {
      // 1. Soft-delete employee & reset load
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          deletedAt: new Date(),
          load: 0,
        },
      });

      // 2. Find active assignments assigned to this employee
      const activeAssignments = await tx.assignment.findMany({
        where: {
          employeeId,
          tenantId,
          complaint: {
            deletedAt: null,
            status: { in: ["open", "in_progress"] },
          },
        },
        select: {
          id: true,
          complaintId: true,
          departmentId: true,
        },
      });

      // 3. Re-route active tickets to Tenant Admin / Unassigned Queue
      for (const assignment of activeAssignments) {
        await WorkloadService.handleUnassignedDepartmentState(
          tx,
          tenantId,
          assignment.departmentId,
          assignment.complaintId
        );
      }
    });

    res.status(200).json({ message: "Employee deleted successfully and active tickets re-routed" });
  } catch (err) {
    console.error("[DeleteEmployee Error]:", err);
    res.status(500).json({ message: "Internal server error deleting employee" });
  }
};

export const restoreEmployee = async (req: Request, res: Response) => {
  const { employeeId } = req.body as { tenantId: string; employeeId: string };

  const tenantId = req.user?.tenantId;

  if (!employeeId || !tenantId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    await db.employee.updateMany({
      where: { id: employeeId, tenantId },
      data: { deletedAt: null },
    });
    res.status(200).json({ message: "Employee restored successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const mapEmployeeToDepartment = async (req: Request, res: Response) => {
  const { employeeId, departmentId } = req.body as { tenantId: string; employeeId: string; departmentId: string };

  if (!employeeId || !departmentId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    await db.employee.updateMany({
      where: { id: employeeId, tenantId, deletedAt: null },
      data: { departmentId },
    });
    res.status(200).json({ message: "Employee mapped to department successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createEmployeeVectors = async (req: Request, res: Response) => {
  const { keywords, employeeId } = req.body as { keywords: string; employeeId: string };

  if (!employeeId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  if (!keywords) {
    res.status(400).json({ message: "At least one keyword is required" });
    return;
  }

  const keywordArray = keywords
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  try {
    let vector: unknown = null;
    let vectorDimension: number | undefined = undefined;

    try {
      const response = await fetch(`${config.ML_SERVICE_URL}/profile/vectorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_keywords: keywordArray,
        }),
      });

      if (response.ok) {
        const vectorData = await response.json();
        vector = vectorData.vectors;
        vectorDimension = vectorData.vector_dimension;
      }
    } catch {
      // AI zero-shot works without ML service
    }

    const existingEmp = await db.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true },
    });

    if (!existingEmp || existingEmp.tenantId !== tenantId) {
      res.status(403).json({ message: "Forbidden: Employee profile access denied" });
      return;
    }

    const employeeResult = await db.employee.update({
      where: { id: employeeId },
      data: {
        vector: vector ? (vector as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        keywords: keywordArray,
      },
      select: { id: true, name: true },
    });

    res.status(200).json({
      message: "Employee keywords updated successfully",
      employee: {
        id: employeeResult.id,
        name: employeeResult.name,
        keywords: keywordArray,
      },
      vector_dimension: vectorDimension || null,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEmployeeName = async (req: Request, res: Response) => {
  const { employeeId, name } = req.body as { employeeId: string; name: string };
  const tenantId = req.user?.tenantId;

  if (!employeeId || !name || !tenantId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const existingEmp = await db.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true },
    });

    if (!existingEmp || existingEmp.tenantId !== tenantId) {
      res.status(403).json({ message: "Forbidden: Employee profile access denied" });
      return;
    }

    const updated = await db.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id: employeeId },
        data: { name },
        select: { id: true, name: true, userId: true },
      });

      await tx.user.update({
        where: { id: emp.userId },
        data: { name },
      });

      return emp;
    });

    res.status(200).json({
      id: updated.id,
      name: updated.name,
      message: "Employee name updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEmployeeTitle = async (req: Request, res: Response) => {
  const { employeeId, title } = req.body as { employeeId: string; title: string };
  const tenantId = req.user?.tenantId;

  if (!employeeId || !title || !tenantId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const existingEmp = await db.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true },
    });

    if (!existingEmp || existingEmp.tenantId !== tenantId) {
      res.status(403).json({ message: "Forbidden: Employee profile access denied" });
      return;
    }

    const updated = await db.employee.update({
      where: { id: employeeId },
      data: { title },
      select: { id: true, name: true, title: true },
    });

    res.status(200).json({
      id: updated.id,
      name: updated.name,
      title: updated.title,
      message: "Employee title / role updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyAssignments = async (req: Request, res: Response) => {
  const { employeeId } = req.params as { employeeId: string };

  if (!employeeId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const targetEmployee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true, userId: true },
    });

    if (!targetEmployee || targetEmployee.tenantId !== tenantId) {
      res.status(403).json({ message: "Forbidden: Access to specified employee assignments is denied" });
      return;
    }

    // Security Check: AGENT users can only view their own assigned queue
    if (req.user?.role === "AGENT" && targetEmployee.userId !== req.user.userId) {
      res.status(403).json({ message: "Forbidden: Agents can only access their own assignments" });
      return;
    }

    const assignments = await db.assignment.findMany({
      where: {
        employeeId,
        tenantId,
        complaint: { tenantId, deletedAt: null },
      },
      include: { complaint: true },
      orderBy: { assignedAt: "desc" },
    });

    const formatted = assignments.map((a) => ({
      id: a.id,
      complaint_id: a.complaintId,
      assignee_type: a.assigneeType,
      assigned_at: a.assignedAt,
      title: a.complaint.title,
      description: a.complaint.description,
      customer_name: a.complaint.customerName,
      customer_email: a.complaint.customerEmail,
      status: a.complaint.status,
      priority: a.complaint.priority,
      sentiment: a.complaint.sentiment,
      summary: a.complaint.summary,
      suggested_reply: a.complaint.suggestedReply,
      external_reference_id: a.complaint.externalReferenceId,
      created_at: a.complaint.createdAt,
      updated_at: a.complaint.updatedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
