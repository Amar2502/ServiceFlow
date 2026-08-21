import { Request, Response } from "express";
import { db } from "../../config/db";
import { WorkloadService } from "../complaints/workload.service";

export const createDepartment = async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Department name is required" });
  }

  try {
    const department = await db.department.create({
      data: {
        name: name.trim(),
        tenantId,
      },
    });

    return res.status(201).json({
      message: "Department created successfully",
      department: {
        id: department.id,
        name: department.name,
      },
    });
  } catch (err) {
    console.error("Create department failed:", err);

    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const getAllDepartments = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    const departments = await db.department.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const formatted = departments.map((d) => ({
      id: d.id,
      tenant_id: d.tenantId,
      name: d.name,
      created_at: d.createdAt,
      deleted_at: d.deletedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllDeletedDepartments = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    const departments = await db.department.findMany({
      where: { tenantId, deletedAt: { not: null } },
    });

    const formatted = departments.map((d) => ({
      id: d.id,
      tenant_id: d.tenantId,
      name: d.name,
      created_at: d.createdAt,
      deleted_at: d.deletedAt,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDepartment = async (req: Request, res: Response) => {
  const { departmentId } = req.body as { departmentId: string };
  const tenantId = req.user?.tenantId;

  if (!departmentId || !tenantId) {
    res.status(400).json({ message: "departmentId and tenant authentication required" });
    return;
  }

  try {
    const dept = await db.department.findFirst({
      where: { id: departmentId, tenantId },
    });

    if (!dept) {
      res.status(404).json({ message: "Department not found" });
      return;
    }

    await db.$transaction(async (tx) => {
      // 1. Soft-delete department
      await tx.department.update({
        where: { id: departmentId },
        data: { deletedAt: new Date() },
      });

      // 2. Unlink employees mapped to this department
      await tx.employee.updateMany({
        where: { departmentId, tenantId },
        data: { departmentId: null },
      });

      // 2b. Clear departmentId on pending invitation tokens to maintain referential integrity
      await tx.invite.updateMany({
        where: { departmentId, tenantId },
        data: { departmentId: null },
      });

      // 3. Find active assignments mapped to this department
      const activeAssignments = await tx.assignment.findMany({
        where: {
          departmentId,
          tenantId,
          complaint: {
            deletedAt: null,
            status: { in: ["open", "in_progress"] },
          },
        },
        select: {
          id: true,
          complaintId: true,
        },
      });

      // 4. Re-route active tickets to Tenant Admin or General Unassigned Queue
      for (const assignment of activeAssignments) {
        await WorkloadService.handleUnassignedDepartmentState(
          tx,
          tenantId,
          null,
          assignment.complaintId
        );
      }
    });

    res.status(200).json({ message: "Department deleted successfully, staff unlinked, and active tickets re-routed" });
  } catch (err) {
    console.error("[DeleteDepartment Error]:", err);
    res.status(500).json({ message: "Internal server error deleting department" });
  }
};

export const restoreDepartment = async (req: Request, res: Response) => {
  const { departmentId } = req.body as { departmentId: string };
  const tenantId = req.user?.tenantId;

  if (!departmentId || !tenantId) {
    res.status(400).json({ message: "Unauthorized or missing parameters" });
    return;
  }

  try {
    await db.department.updateMany({
      where: { id: departmentId, tenantId },
      data: { deletedAt: null },
    });
    res.status(200).json({ message: "Department restored successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
