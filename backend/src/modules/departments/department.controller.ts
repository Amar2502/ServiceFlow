import { Request, Response } from "express";
import { db } from "../../config/db";
import { config } from "../../config/config";
import { Prisma } from "../../generated/prisma";
import { WorkloadService } from "../complaints/workload.service";

export const createDepartment = async (req: Request, res: Response) => {
  const { name, keywords } = req.body as { name: string; keywords: string };

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!name || !keywords) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const keywordArray = keywords
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (keywordArray.length === 0) {
    return res.status(400).json({ message: "At least one keyword is required" });
  }

  try {
    const existingDepartments = await db.department.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, keywords: true },
    });

    type Range = { id: string | null; start: number; len: number; isNew: boolean };
    const units: { id: string | null; keywords: string[] }[] = [
      ...existingDepartments.map((r) => ({
        id: r.id,
        keywords: Array.isArray(r.keywords) ? r.keywords : [],
      })),
      { id: null, keywords: keywordArray },
    ];

    const flat: string[] = [];
    const ranges: Range[] = [];
    let offset = 0;
    for (const u of units) {
      if (u.keywords.length === 0) continue;
      ranges.push({
        id: u.id,
        start: offset,
        len: u.keywords.length,
        isNew: u.id === null,
      });
      flat.push(...u.keywords);
      offset += u.keywords.length;
    }

    if (flat.length === 0) {
      return res.status(400).json({ message: "At least one keyword is required" });
    }

    let matrix: unknown[] | undefined = undefined;
    let vectorDimension: number | undefined = undefined;

    // Optional vectorization if ML service URL configured
    try {
      const response = await fetch(`${config.ML_SERVICE_URL}/profile/vectorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_keywords: flat,
        }),
      });

      if (response.ok) {
        const vectorData = await response.json();
        matrix = vectorData.vectors;
        vectorDimension = vectorData.vector_dimension;
      }
    } catch {
      // Groq SDK direct classification works zero-shot even without ML service
    }

    let newDepartmentId: string | null = null;

    await db.$transaction(async (tx) => {
      if (matrix && Array.isArray(matrix)) {
        for (const r of ranges) {
          const block = matrix.slice(r.start, r.start + r.len) as unknown as Prisma.InputJsonValue;
          if (r.isNew) {
            const ins = await tx.department.create({
              data: {
                name,
                keywords: keywordArray,
                vector: block,
                tenantId,
              },
              select: { id: true },
            });
            newDepartmentId = ins.id;
          } else if (r.id) {
            await tx.department.updateMany({
              where: { id: r.id, tenantId },
              data: { vector: block },
            });
          }
        }
      } else {
        const ins = await tx.department.create({
          data: {
            name,
            keywords: keywordArray,
            tenantId,
          },
          select: { id: true },
        });
        newDepartmentId = ins.id;
      }
    });

    if (!newDepartmentId) {
      throw new Error("Failed to create department record");
    }

    return res.status(201).json({
      message: "Department created successfully",
      department: {
        id: newDepartmentId,
        name,
        keywords: keywordArray,
      },
      vector_dimension: vectorDimension || null,
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
    });

    const formatted = departments.map((d) => ({
      id: d.id,
      tenant_id: d.tenantId,
      name: d.name,
      keywords: d.keywords,
      vector: d.vector,
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
      keywords: d.keywords,
      vector: d.vector,
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
