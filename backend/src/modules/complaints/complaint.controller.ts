import { Request, Response } from "express";
import { db } from "../../config/db";
import { ComplaintStatus } from "../../generated/prisma";
import { GroqService, DepartmentRoutingContext } from "./groq.service";
import { WorkloadService } from "./workload.service";
import { SlaService } from "../sla/sla.service";
import { ComplaintsSocket } from "./complaints.socket";

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
    const responsePayload = await db.$transaction(async (tx) => {
      // 1. Fetch active tenant departments for zero-shot LLM matching
      const dbDepartments = await tx.department.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
      });

      if (dbDepartments.length === 0) {
        throw new Error("No active departments configured for this tenant.");
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

      // 4. Calculate exact SLA Due Timestamp based on AI-predicted Priority
      const slaDueAt = SlaService.calculateSlaDueAt(aiResult.priority);

      // 5. Create Complaint with rich AI metadata and SLA due timestamp
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
          slaDueAt,
          isSlaBreached: false,
        },
      });

      const complaintId = complaint.id;
      const targetDepartment = dbDepartments.find((d) => d.id === aiResult.department_id) || dbDepartments[0];

      // 6. Dynamic Workload Balancing Algorithm (Real-time active count & counter drift fix)
      const selectedEmployee = await WorkloadService.selectLeastLoadedEmployee(
        tx,
        tenantId,
        targetDepartment.id
      );

      let assignmentData: any = null;

      if (selectedEmployee) {
        await tx.assignment.create({
          data: {
            tenantId,
            complaintId,
            assigneeType: "EMPLOYEE",
            employeeId: selectedEmployee.id,
            departmentId: targetDepartment.id,
          },
        });

        assignmentData = {
          assignee_type: "EMPLOYEE",
          employee_id: selectedEmployee.id,
          employee_userId: selectedEmployee.userId,
          employee_name: selectedEmployee.user?.name || selectedEmployee.name,
          employee_email: selectedEmployee.user?.email,
          department_id: targetDepartment.id,
          department_name: targetDepartment.name,
        };
      } else {
        assignmentData = await WorkloadService.handleUnassignedDepartmentState(
          tx,
          tenantId,
          targetDepartment.id,
          complaintId
        );
        if (assignmentData.department_id) {
          assignmentData.department_name = targetDepartment.name;
        }
      }

      return {
        message: "Complaint successfully created, routed via Groq GenAI & SLA target calculated",
        complaintId,
        ai_triage: {
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          summary: aiResult.summary,
          suggested_reply: aiResult.suggested_reply,
          reasoning: aiResult.reasoning,
          confidence: aiResult.confidence,
        },
        sla: {
          sla_due_at: slaDueAt,
          is_sla_breached: false,
        },
        assignment: assignmentData,
      };
    });

    // 7. Emit Real-time Socket.io Events
    ComplaintsSocket.emitTicketCreated(tenantId, responsePayload);

    if (responsePayload.assignment?.employee_userId) {
      ComplaintsSocket.emitTicketAssigned(responsePayload.assignment.employee_userId, responsePayload);
    }

    return res.status(201).json(responsePayload);
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
        sla_due_at: c.slaDueAt,
        is_sla_breached: c.isSlaBreached,
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

  const tenantId = req.user?.tenantId;

  try {
    const updated = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id: complaintId },
        data: { status: status as ComplaintStatus },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);

      return complaint;
    });

    if (tenantId) {
      ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
        id: updated.id,
        status: updated.status,
      });
    }

    return res.status(200).json({
      id: updated.id,
      status: updated.status,
      message: "Complaint status updated and load counter synced successfully",
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

  const tenantId = req.user?.tenantId;

  try {
    await db.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { deletedAt: new Date() },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
    });

    if (tenantId) {
      ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
        id: complaintId,
        status: "deleted",
      });
    }

    return res.status(200).json({ message: "Complaint soft-deleted and load counter synced" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const restoreComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.body as { complaintId: string };

  if (!complaintId) {
    return res.status(400).json({ message: "complaintId is required" });
  }

  const tenantId = req.user?.tenantId;

  try {
    await db.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { deletedAt: null },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
    });

    if (tenantId) {
      ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
        id: complaintId,
        status: "restored",
      });
    }

    return res.status(200).json({ message: "Complaint restored and load counter synced" });
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
      sla_due_at: complaint.slaDueAt,
      is_sla_breached: complaint.isSlaBreached,
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
    await db.$transaction(async (tx) => {
      const oldAssignments = await tx.assignment.findMany({ where: { complaintId } });

      await tx.assignment.updateMany({
        where: { complaintId },
        data: { employeeId, assigneeType: "EMPLOYEE" },
      });

      for (const old of oldAssignments) {
        if (old.employeeId) {
          await WorkloadService.syncEmployeeLoad(tx, old.employeeId);
        }
      }

      await WorkloadService.syncEmployeeLoad(tx, employeeId);
    });

    ComplaintsSocket.emitTicketReassigned(tenantId, complaintId, {
      complaintId,
      assigneeType: "EMPLOYEE",
      employeeId,
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
    await db.$transaction(async (tx) => {
      const oldAssignments = await tx.assignment.findMany({ where: { complaintId } });

      await tx.assignment.updateMany({
        where: { complaintId },
        data: { departmentId, employeeId: null, assigneeType: "DEPARTMENT" },
      });

      for (const old of oldAssignments) {
        if (old.employeeId) {
          await WorkloadService.syncEmployeeLoad(tx, old.employeeId);
        }
      }
    });

    ComplaintsSocket.emitTicketReassigned(tenantId, complaintId, {
      complaintId,
      assigneeType: "DEPARTMENT",
      departmentId,
    });

    return res.status(200).json({ message: "Complaint assigned to department successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
