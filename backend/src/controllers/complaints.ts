import { Request, Response } from "express";
import { db } from "../config/db";
import { config } from "../config/config";
import { ComplaintStatus, Prisma } from "../generated/prisma";

interface CreateComplaintBody {
  title: string;
  description?: string;
  customerName: string;
  customerEmail: string;
  externalReferenceId?: string;
}

type ProfilePredictResult = {
  profile_id: string;
  confidence: number;
  needs_review: boolean;
};

async function callProfilePredict(
  complaint: string,
  vectors: Record<string, unknown>
): Promise<ProfilePredictResult> {
  const response = await fetch(`${config.ML_SERVICE_URL}/profile/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      complaint,
      vectors,
      confidence_threshold: 0.6,
    }),
  });
  const raw = await response.text();
  let data: { detail?: unknown; profile_id?: string; confidence?: number; needs_review?: boolean } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    /* non-JSON body */
  }
  if (!response.ok) {
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
          ? JSON.stringify(data.detail)
          : raw.slice(0, 800);
    throw new Error(`ML routing failed (${response.status}): ${detail}`);
  }
  if (!data.profile_id) {
    throw new Error("ML response missing profile_id");
  }
  return data as ProfilePredictResult;
}

export const createComplaint = async (req: Request, res: Response) => {
  const { title, description, customerName, customerEmail, externalReferenceId } =
    req.body as CreateComplaintBody;

  const tenantId = req.user?.tenantId;
  const routingMode = req.user?.routingMode;

  if (!title || !customerName || !customerEmail) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!routingMode) {
    return res.status(400).json({ message: "Routing mode not configured" });
  }

  const complaintText = description ? `${title} ${description}` : title;

  try {
    return await db.$transaction(async (tx) => {
      // 1️⃣ Create complaint
      const complaint = await tx.complaint.create({
        data: {
          title,
          description,
          customerName,
          customerEmail,
          externalReferenceId,
          tenantId
        }
      });

      const complaintId = complaint.id;

      // 2️⃣ Routing
      if (routingMode === "DEPARTMENT") {
        const departments = await tx.department.findMany({
          where: {
            tenantId,
            deletedAt: null,
            vector: { not: Prisma.DbNull }
          }
        });

        if (departments.length === 0) {
          throw new Error("No department vectors found");
        }

        const vectors: Record<string, unknown> = {};
        for (const d of departments) {
          vectors[d.id] = d.vector;
        }

        const prediction = await callProfilePredict(complaintText, vectors);

        const selected_department = prediction.profile_id;
        const department_name = departments.find(d => d.id === selected_department)?.name;

        if (!selected_department) {
          throw new Error("Predicted routing mode not found");
        }

        const employees = await tx.employee.findMany({
          where: {
            tenantId,
            departmentId: selected_department,
            deletedAt: null
          }
        });

        if (employees.length === 0) {
          throw new Error("No employees found");
        }

        const employee_id = [...employees].sort((a, b) => a.load - b.load)[0].id;

        await tx.assignment.create({
          data: {
            tenantId,
            complaintId,
            assigneeType: "EMPLOYEE",
            employeeId: employee_id
          }
        });

        await tx.employee.update({
          where: { id: employee_id },
          data: { load: { increment: 1 } }
        });

        return res.status(201).json({
          message: "Complaint created and assigned",
          complaintId,
          assignment: {
            assignee_type: "DEPARTMENT",
            department_id: selected_department,
            department_name: department_name,
            confidence: prediction.confidence,
            needs_review: prediction.needs_review
          }
        });
      }

      if (routingMode === "EMPLOYEE") {
        const employees = await tx.employee.findMany({
          where: {
            tenantId,
            deletedAt: null,
            vector: { not: Prisma.DbNull }
          },
          include: { user: true }
        });

        if (employees.length === 0) {
          throw new Error("No employee vectors found");
        }

        const vectors: Record<string, unknown> = {};
        for (const e of employees) {
          vectors[e.id] = e.vector;
        }

        const prediction = await callProfilePredict(complaintText, vectors);

        const selected_employee = prediction.profile_id;

        const employee = employees.find(e => e.id === selected_employee);

        if (!selected_employee || !employee) {
          throw new Error("Predicted routing mode not found");
        }

        await tx.assignment.create({
          data: {
            tenantId,
            complaintId,
            assigneeType: "EMPLOYEE",
            employeeId: selected_employee
          }
        });

        await tx.employee.update({
          where: { id: selected_employee },
          data: { load: { increment: 1 } }
        });

        return res.status(201).json({
          message: "Complaint created and assigned",
          complaintId,
          assignment: {
            assignee_type: "EMPLOYEE",
            employee_id: employee.id,
            employee_name: employee.name,
            employee_title: employee.title,
            confidence: prediction.confidence,
            needs_review: prediction.needs_review
          }
        });
      }

      throw new Error("Invalid routing mode");
    });
  } catch (err) {
    console.error("Create complaint failed:", err);

    return res.status(500).json({
      message: "Internal server error",
      error: err instanceof Error ? err.message : "Unknown error"
    });
  }
};


export const getAllComplaints = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  try {
    const complaints = await db.complaint.findMany({
      where: { tenantId }
    });

    const formatted = complaints.map(c => ({
      id: c.id,
      tenant_id: c.tenantId,
      title: c.title,
      description: c.description,
      customer_name: c.customerName,
      customer_email: c.customerEmail,
      external_reference_id: c.externalReferenceId,
      status: c.status,
      is_correctly_classified: c.isCorrectlyClassified,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      deleted_at: c.deletedAt
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const updateComplaintStatus = async (req: Request, res: Response) => {
  const { complaintId, status } = req.body as { complaintId: string, status: string };

  if (!complaintId || !status) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const result = await db.complaint.update({
      where: { id: complaintId },
      data: { status: status as ComplaintStatus },
      select: { id: true, status: true }
    });

    res.status(200).json({
      id: result.id,
      status: result.status,
      message: "Complaint status updated successfully"
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const deleteComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.body as { tenantId: string, complaintId: string };

  if (!complaintId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    await db.complaint.update({
      where: { id: complaintId },
      data: { deletedAt: new Date() }
    });
    res.status(200).json({ message: "Complaint deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const restoreComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.body as { tenantId: string, complaintId: string };

  if (!complaintId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    await db.complaint.update({
      where: { id: complaintId },
      data: { deletedAt: null }
    });
    res.status(200).json({ message: "Complaint restored successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getComplaintDetails = async (req: Request, res: Response) => {
  const { complaintId } = req.params as { complaintId: string };

  if (!complaintId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      include: {
        assignments: {
          include: {
            employee: {
              include: { user: true }
            },
            department: true
          }
        }
      }
    });

    if (!complaint) {
      res.status(404).json({ message: "Complaint not found" });
      return;
    }

    const assignment = complaint.assignments[0] || null;

    const result = {
      id: complaint.id,
      tenant_id: complaint.tenantId,
      title: complaint.title,
      description: complaint.description,
      customer_name: complaint.customerName,
      customer_email: complaint.customerEmail,
      external_reference_id: complaint.externalReferenceId,
      status: complaint.status,
      is_correctly_classified: complaint.isCorrectlyClassified,
      created_at: complaint.createdAt,
      updated_at: complaint.updatedAt,
      deleted_at: complaint.deletedAt,
      complaint_id: complaint.id,
      assignee_type: assignment?.assigneeType || null,
      employee_id: assignment?.employeeId || null,
      department_id: assignment?.departmentId || null,
      assigned_at: assignment?.assignedAt || null,
      user_name: assignment?.employee?.user?.name || assignment?.employee?.name || null,
      user_email: assignment?.employee?.user?.email || null,
      department_name: assignment?.department?.name || null
    };

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const assignComplaintToEmployee = async (req: Request, res: Response) => {
  const { complaintId, employeeId } = req.body as { complaintId: string, employeeId: string };

  if (!complaintId || !employeeId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    await db.assignment.updateMany({
      where: { complaintId },
      data: { employeeId, assigneeType: "EMPLOYEE" }
    });
    res.status(200).json({ message: "Complaint assigned to employee successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const assignComplaintToDepartment = async (req: Request, res: Response) => {
  const { complaintId, departmentId } = req.body as { complaintId: string, departmentId: string };

  if (!complaintId || !departmentId) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    res.status(400).json({ message: "Unauthorized" });
    return;
  }

  try {
    await db.assignment.updateMany({
      where: { complaintId },
      data: { departmentId, assigneeType: "DEPARTMENT" }
    });
    res.status(200).json({ message: "Complaint assigned to department successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
}