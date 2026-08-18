import { Request, Response } from "express";
import { db } from "../config/db";
import { ComplaintStatus } from "../generated/prisma";
import { GroqService, DepartmentRoutingContext } from "../services/groq.service";

interface CreateComplaintBody {
  title: string;
  description?: string;
  customerName: string;
  customerEmail: string;
  externalReferenceId?: string;
}

export const createComplaint = async (req: Request, res: Response) => {
  const { title, description, customerName, customerEmail, externalReferenceId } =
    req.body as CreateComplaintBody;

  const tenantId = req.user?.tenantId;

  if (!title || !customerName || !customerEmail) {
    return res.status(400).json({ message: "All required fields (title, customerName, customerEmail) must be provided" });
  }

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized: Missing tenant context" });
  }

  const complaintText = description ? `${title}\n${description}` : title;

  try {
    return await db.$transaction(async (tx) => {
      // 1. Fetch tenant departments for zero-shot LLM matching
      const dbDepartments = await tx.department.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
      });

      if (dbDepartments.length === 0) {
        return res.status(400).json({
          message: "No active departments configured for this tenant.",
        });
      }

      // 2. Prepare department context list for Groq AI
      const deptContexts: DepartmentRoutingContext[] = dbDepartments.map((d) => ({
        id: d.id,
        code: d.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        name: d.name,
        description: d.keywords && d.keywords.length > 0 ? d.keywords.join(", ") : d.name,
      }));

      // 3. Perform Sub-200ms Groq GenAI Multi-Task Extraction
      const aiResult = await GroqService.classifyComplaint(complaintText, deptContexts);

      // 4. Create Complaint with rich AI metadata
      const complaint = await tx.complaint.create({
        data: {
          title,
          description,
          customerName,
          customerEmail,
          externalReferenceId,
          tenantId,
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          summary: aiResult.summary,
          suggestedReply: aiResult.suggested_reply,
          aiReasoning: aiResult.reasoning,
          aiConfidence: aiResult.confidence,
        },
      });

      const complaintId = complaint.id;
      const targetDepartment = dbDepartments.find((d) => d.id === aiResult.department_id) || dbDepartments[0];

      // 5. Dynamic Workload Balancing (Find least-loaded active agent in target department)
      const activeEmployees = await tx.employee.findMany({
        where: {
          tenantId,
          departmentId: targetDepartment.id,
          deletedAt: null,
        },
        include: {
          user: true,
        },
      });

      let assignmentData: any = null;

      if (activeEmployees.length > 0) {
        // Assign to agent with lowest active ticket load
        const selectedEmployee = [...activeEmployees].sort((a, b) => a.load - b.load)[0];

        await tx.assignment.create({
          data: {
            tenantId,
            complaintId,
            assigneeType: "EMPLOYEE",
            employeeId: selectedEmployee.id,
            departmentId: targetDepartment.id,
          },
        });

        // Increment employee active load counter
        await tx.employee.update({
          where: { id: selectedEmployee.id },
          data: { load: { increment: 1 } },
        });

        assignmentData = {
          assignee_type: "EMPLOYEE",
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.user?.name || selectedEmployee.name,
          employee_email: selectedEmployee.user?.email,
          department_id: targetDepartment.id,
          department_name: targetDepartment.name,
        };
      } else {
        // Assign to Department Queue if no individual agents exist
        await tx.assignment.create({
          data: {
            tenantId,
            complaintId,
            assigneeType: "DEPARTMENT",
            departmentId: targetDepartment.id,
          },
        });

        assignmentData = {
          assignee_type: "DEPARTMENT",
          department_id: targetDepartment.id,
          department_name: targetDepartment.name,
        };
      }

      // 6. Return 201 Created Response with full AI insights
      return res.status(201).json({
        message: "Complaint successfully created and routed via Groq GenAI",
        complaintId,
        ai_triage: {
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          summary: aiResult.summary,
          suggested_reply: aiResult.suggested_reply,
          reasoning: aiResult.reasoning,
          confidence: aiResult.confidence,
        },
        assignment: assignmentData,
      });
    });
  } catch (err) {
    console.error("Create complaint failed:", err);
    return res.status(500).json({
      message: "Internal server error during complaint creation & routing",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export const getAllComplaints = async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const complaints = await db.complaint.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: {
            employee: { include: { user: true } },
            department: true,
          },
        },
      },
    });

    const formatted = complaints.map((c) => {
      const assignment = c.assignments[0] || null;
      return {
        id: c.id,
        tenant_id: c.tenantId,
        title: c.title,
        description: c.description,
        customer_name: c.customerName,
        customer_email: c.customerEmail,
        external_reference_id: c.externalReferenceId,
        status: c.status,
        priority: c.priority,
        sentiment: c.sentiment,
        summary: c.summary,
        suggested_reply: c.suggestedReply,
        ai_reasoning: c.aiReasoning,
        ai_confidence: c.aiConfidence,
        is_correctly_classified: c.isCorrectlyClassified,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        assignment: assignment
          ? {
              assignee_type: assignment.assigneeType,
              employee_id: assignment.employeeId,
              employee_name: assignment.employee?.user?.name || assignment.employee?.name || null,
              department_id: assignment.departmentId,
              department_name: assignment.department?.name || null,
            }
          : null,
      };
    });

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("GetAllComplaints error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateComplaintStatus = async (req: Request, res: Response) => {
  const { complaintId, status } = req.body as { complaintId: string; status: string };

  if (!complaintId || !status) {
    return res.status(400).json({ message: "complaintId and status are required" });
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id: complaintId },
        data: { status: status as ComplaintStatus },
        include: { assignments: true },
      });

      // If marked resolved, decrement employee load counter
      if (status === "resolved" && complaint.assignments.length > 0) {
        const assignment = complaint.assignments[0];
        if (assignment.employeeId) {
          await tx.employee.update({
            where: { id: assignment.employeeId },
            data: { load: { decrement: 1 } },
          });
        }
      }

      return complaint;
    });

    return res.status(200).json({
      id: updated.id,
      status: updated.status,
      message: "Complaint status updated successfully",
    });
  } catch (err) {
    console.error("UpdateComplaintStatus error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.body as { complaintId: string };

  if (!complaintId) {
    return res.status(400).json({ message: "complaintId is required" });
  }

  try {
    await db.complaint.update({
      where: { id: complaintId },
      data: { deletedAt: new Date() },
    });
    return res.status(200).json({ message: "Complaint deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const restoreComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.body as { complaintId: string };

  if (!complaintId) {
    return res.status(400).json({ message: "complaintId is required" });
  }

  try {
    await db.complaint.update({
      where: { id: complaintId },
      data: { deletedAt: null },
    });
    return res.status(200).json({ message: "Complaint restored successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getComplaintDetails = async (req: Request, res: Response) => {
  const { complaintId } = req.params as { complaintId: string };

  if (!complaintId) {
    return res.status(400).json({ message: "complaintId parameter is required" });
  }

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      include: {
        assignments: {
          include: {
            employee: {
              include: { user: true },
            },
            department: true,
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
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
      priority: complaint.priority,
      sentiment: complaint.sentiment,
      summary: complaint.summary,
      suggested_reply: complaint.suggestedReply,
      ai_reasoning: complaint.aiReasoning,
      ai_confidence: complaint.aiConfidence,
      is_correctly_classified: complaint.isCorrectlyClassified,
      created_at: complaint.createdAt,
      updated_at: complaint.updatedAt,
      deleted_at: complaint.deletedAt,
      assignment: assignment
        ? {
            assignee_type: assignment.assigneeType,
            employee_id: assignment.employeeId,
            department_id: assignment.departmentId,
            assigned_at: assignment.assignedAt,
            user_name: assignment.employee?.user?.name || assignment.employee?.name || null,
            user_email: assignment.employee?.user?.email || null,
            department_name: assignment.department?.name || null,
          }
        : null,
    };

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const assignComplaintToEmployee = async (req: Request, res: Response) => {
  const { complaintId, employeeId } = req.body as { complaintId: string; employeeId: string };

  if (!complaintId || !employeeId) {
    return res.status(400).json({ message: "complaintId and employeeId are required" });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await db.assignment.updateMany({
      where: { complaintId },
      data: { employeeId, assigneeType: "EMPLOYEE" },
    });
    return res.status(200).json({ message: "Complaint assigned to employee successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const assignComplaintToDepartment = async (req: Request, res: Response) => {
  const { complaintId, departmentId } = req.body as { complaintId: string; departmentId: string };

  if (!complaintId || !departmentId) {
    return res.status(400).json({ message: "complaintId and departmentId are required" });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await db.assignment.updateMany({
      where: { complaintId },
      data: { departmentId, assigneeType: "DEPARTMENT" },
    });
    return res.status(200).json({ message: "Complaint assigned to department successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};