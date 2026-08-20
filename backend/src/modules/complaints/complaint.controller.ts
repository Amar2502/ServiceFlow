import { Request, Response } from "express";
import { db } from "../../config/db";
import { ComplaintStatus } from "../../generated/prisma";
import { GroqService, DepartmentRoutingContext } from "./groq.service";
import { WorkloadService } from "./workload.service";
import { SlaService } from "../sla/sla.service";
import { ComplaintsSocket } from "./complaints.socket";
import { EmailService } from "../notifications/email.service";

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
      // 1. Fetch tenant routing mode (DEPARTMENT vs EMPLOYEE)
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { routingMode: true },
      });

      const routingMode = tenant?.routingMode || "DEPARTMENT";
      let aiResult: any = null;
      let isConfidentMatch = true;
      let targetDepartment: any = null;
      let targetEmployee: any = null;

      if (routingMode === "EMPLOYEE") {
        // EMPLOYEE-CENTRIC ROUTING MODE: Route directly to employee profiles based on role title & keywords
        const dbEmployees = await tx.employee.findMany({
          where: { tenantId, deletedAt: null },
          include: { user: true, department: true },
        });

        if (dbEmployees.length === 0) {
          isConfidentMatch = false;
          aiResult = {
            priority: "MEDIUM",
            sentiment: "NEUTRAL",
            summary: title,
            suggested_reply: "Thank you for reaching out. An administrator will review your ticket shortly.",
            reasoning: "No active employees configured for Employee-Centric routing. Ticket placed in Admin Manual Assignment queue.",
            confidence: 0.0,
            department_id: null,
          };
        } else {
          // Build role-based routing context for each employee
          const empContexts: DepartmentRoutingContext[] = dbEmployees.map((e) => {
            const roleTitle = e.title || e.name || e.user?.name || "Support Specialist";
            const kwText = e.keywords && e.keywords.length > 0 ? e.keywords.join(", ") : roleTitle;
            return {
              id: e.id,
              code: `emp_${e.id.replace(/-/g, "_")}`,
              name: `${e.user?.name || e.name || "Agent"} (${roleTitle})`,
              description: `Role/Title: ${roleTitle}. Specialization Keywords: ${kwText}`,
            };
          });

          aiResult = await GroqService.classifyComplaint(complaintText, empContexts);

          if (!aiResult || aiResult.confidence < 0.4) {
            isConfidentMatch = false;
            aiResult.reasoning = `Low AI routing confidence (${(aiResult?.confidence * 100 || 0).toFixed(0)}%). Flagged for Admin manual assignment.`;
          } else {
            targetEmployee = dbEmployees.find((e) => e.id === aiResult.department_id) || dbEmployees[0];
          }
        }
      } else {
        // DEPARTMENT-CENTRIC ROUTING MODE: Route to department, then select least-loaded agent
        const dbDepartments = await tx.department.findMany({
          where: { tenantId, deletedAt: null },
        });

        if (dbDepartments.length === 0) {
          isConfidentMatch = false;
          aiResult = {
            priority: "MEDIUM",
            sentiment: "NEUTRAL",
            summary: title,
            suggested_reply: "Thank you for reaching out. An administrator will review your ticket shortly.",
            reasoning: "No active departments configured. Ticket placed in Admin Manual Assignment queue.",
            confidence: 0.0,
            department_id: null,
          };
        } else {
          const deptContexts: DepartmentRoutingContext[] = dbDepartments.map((d) => ({
            id: d.id,
            code: d.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
            name: d.name,
            description: d.keywords && d.keywords.length > 0 ? d.keywords.join(", ") : d.name,
          }));

          aiResult = await GroqService.classifyComplaint(complaintText, deptContexts);

          if (!aiResult || aiResult.confidence < 0.4) {
            isConfidentMatch = false;
            aiResult.reasoning = `Low AI routing confidence (${(aiResult?.confidence * 100 || 0).toFixed(0)}%). Flagged for Admin manual assignment.`;
          } else {
            targetDepartment = dbDepartments.find((d) => d.id === aiResult.department_id) || dbDepartments[0];
          }
        }
      }

      // Calculate exact SLA Due Timestamp based on AI-predicted Priority
      const slaDueAt = SlaService.calculateSlaDueAt(aiResult.priority);

      // Create Complaint with rich AI metadata and SLA due timestamp
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
          isCorrectlyClassified: isConfidentMatch,
        },
      });

      const complaintId = complaint.id;
      let assignmentData: any = null;

      if (isConfidentMatch) {
        if (routingMode === "EMPLOYEE" && targetEmployee) {
          // Direct Employee Assignment
          await tx.assignment.create({
            data: {
              tenantId,
              complaintId,
              assigneeType: "EMPLOYEE",
              employeeId: targetEmployee.id,
              departmentId: targetEmployee.departmentId,
            },
          });

          await WorkloadService.syncEmployeeLoad(tx, targetEmployee.id);

          assignmentData = {
            assignee_type: "EMPLOYEE",
            employee_id: targetEmployee.id,
            employee_userId: targetEmployee.userId,
            employee_name: targetEmployee.user?.name || targetEmployee.name,
            employee_email: targetEmployee.user?.email,
            employee_title: targetEmployee.title || null,
            department_id: targetEmployee.departmentId || null,
            department_name: targetEmployee.department?.name || null,
          };
        } else if (routingMode === "DEPARTMENT" && targetDepartment) {
          // Department Assignment with Least-Loaded Employee Selection
          const selectedEmployee = await WorkloadService.selectLeastLoadedEmployee(
            tx,
            tenantId,
            targetDepartment.id
          );

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

            await WorkloadService.syncEmployeeLoad(tx, selectedEmployee.id);

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
        }
      }

      return {
        message: isConfidentMatch
          ? "Complaint created, routed via Groq GenAI & SLA target calculated"
          : "Complaint created & flagged for Admin manual assignment",
        complaintId,
        customerEmail,
        customerName,
        title,
        unassigned: !isConfidentMatch,
        ai_triage: {
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          summary: aiResult.summary,
          suggested_reply: aiResult.suggested_reply,
          reasoning: aiResult.reasoning,
          confidence: aiResult.confidence,
        },
        sla: {
          due_at: slaDueAt,
          target_hours: aiResult.priority === "URGENT" ? 2 : aiResult.priority === "HIGH" ? 6 : aiResult.priority === "MEDIUM" ? 24 : 48,
        },
        assignment: assignmentData,
      };
    });

    // Real-Time Socket.io Event Emission
    ComplaintsSocket.emitTicketCreated(tenantId, responsePayload);

    if (responsePayload.assignment?.employee_userId) {
      ComplaintsSocket.emitTicketAssigned(responsePayload.assignment.employee_userId, {
        complaintId: responsePayload.complaintId,
        title: responsePayload.title,
        priority: responsePayload.ai_triage?.priority || "MEDIUM",
        customerName: responsePayload.customerName,
        message: `New complaint assigned: #${responsePayload.complaintId.substring(0, 7)} - "${title}"`,
        timestamp: new Date().toISOString(),
      });
    }

    // Automated Ingestion Email Notification to Customer via Resend
    if (customerEmail) {
      EmailService.sendIngestionConfirmationEmail({
        to: customerEmail,
        customerName: customerName || "Valued Customer",
        complaintId: responsePayload.complaintId,
        title,
        priority: responsePayload.ai_triage.priority,
        slaDueAt: responsePayload.sla.due_at,
      }).catch((err) => console.error("[Ingestion Email Error]:", err));
    }

    return res.status(201).json(responsePayload);
  } catch (err: any) {
    console.error("CreateComplaint error:", err);
    return res.status(500).json({ message: err.message || "Internal server error creating complaint" });
  }
};

export const sendResolutionEmailController = async (req: Request, res: Response) => {
  const { complaintId, resolutionMessage } = req.body as { complaintId: string; resolutionMessage?: string };

  if (!complaintId) {
    return res.status(400).json({ message: "complaintId is required" });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      include: { assignments: { include: { employee: true } } },
    });

    if (!complaint || complaint.tenantId !== tenantId) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (req.user?.role === "AGENT") {
      const isAssignedToAgent = complaint.assignments.some(
        (a) => a.employee?.userId === req.user?.userId
      );
      if (!isAssignedToAgent) {
        return res.status(403).json({ message: "Forbidden: Agents can only send resolution emails for tickets assigned to them." });
      }
    }

    if (!complaint.customerEmail) {
      return res.status(400).json({ message: "Complaint does not have a valid customer email address" });
    }

    const finalResolutionText =
      resolutionMessage?.trim() ||
      complaint.suggestedReply ||
      "Your complaint has been resolved by our support team. Thank you for your patience.";

    const emailSent = await EmailService.sendResolutionEmail({
      to: complaint.customerEmail,
      customerName: complaint.customerName || "Valued Customer",
      complaintId: complaint.id,
      title: complaint.title,
      resolutionMessage: finalResolutionText,
    });

    const updated = await db.$transaction(async (tx) => {
      const c = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
        },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
      return c;
    });

    ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
      id: updated.id,
      status: updated.status,
    });

    return res.status(200).json({
      message: emailSent
        ? "Official resolution email sent to customer and ticket status updated to resolved"
        : "Ticket marked as resolved (email dispatch failed)",
      complaintId: updated.id,
      status: updated.status,
      email_sent: emailSent,
      resolution_message: finalResolutionText,
    });
  } catch (err) {
    console.error("sendResolutionEmailController failed:", err);
    return res.status(500).json({ message: "Internal server error during resolution email dispatch" });
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
          orderBy: { assignedAt: "desc" },
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

export const getComplaintDetails = async (req: Request, res: Response) => {
  const { complaintId } = req.params as { complaintId: string };
  const tenantId = req.user?.tenantId;

  try {
    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      include: {
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: {
            employee: { include: { user: true } },
            department: true,
          },
        },
      },
    });

    if (!complaint || (tenantId && complaint.tenantId !== tenantId)) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const assignment = complaint.assignments[0] || null;

    return res.status(200).json({
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
      assignment: assignment
        ? {
            assignee_type: assignment.assigneeType,
            employee_id: assignment.employeeId,
            employee_name: assignment.employee?.user?.name || assignment.employee?.name || null,
            department_id: assignment.departmentId,
            department_name: assignment.department?.name || null,
          }
        : null,
    });
  } catch (err) {
    console.error("GetComplaintDetails error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateComplaintStatus = async (req: Request, res: Response) => {
  const { complaintId, status } = req.body as { complaintId: string; status: string };

  if (!complaintId || !status) {
    return res.status(400).json({ message: "complaintId and status are required" });
  }

  const tenantId = req.user?.tenantId;

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existing = await db.complaint.findFirst({
      where: { id: complaintId, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Complaint not found or access denied" });
    }

    if (req.user?.role === "AGENT") {
      const activeAssignment = await db.assignment.findFirst({
        where: { complaintId, tenantId },
        include: { employee: true },
      });
      if (activeAssignment?.employee && activeAssignment.employee.userId !== req.user.userId) {
        return res.status(403).json({ message: "Forbidden: Agents can only update status for tickets assigned to them." });
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: status as ComplaintStatus,
          ...(status === "resolved" ? { resolvedAt: new Date() } : {}),
        },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
      return complaint;
    });

    ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
      id: updated.id,
      status: updated.status,
    });

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

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existing = await db.complaint.findFirst({
      where: { id: complaintId, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Complaint not found or access denied" });
    }

    await db.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { deletedAt: new Date() },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
    });

    ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
      id: complaintId,
      status: "deleted",
    });

    return res.status(200).json({ message: "Complaint soft-deleted successfully" });
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

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existing = await db.complaint.findFirst({
      where: { id: complaintId, tenantId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Complaint not found or access denied" });
    }

    await db.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { deletedAt: null },
      });

      await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
    });

    ComplaintsSocket.emitTicketStatusChanged(tenantId, complaintId, {
      id: complaintId,
      status: "open",
    });

    return res.status(200).json({ message: "Complaint restored successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const assignComplaintToEmployee = async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: Only administrators are authorized to assign or reassign tickets." });
  }

  const { complaintId, employeeId } = req.body as { complaintId: string; employeeId: string };

  if (!complaintId || !employeeId) {
    return res.status(400).json({ message: "complaintId and employeeId are required" });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Validate target employee belongs to tenant
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId, deletedAt: null },
      select: { id: true, userId: true, departmentId: true },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found or access denied" });
    }

    // Validate complaint belongs to tenant
    const existingComplaint = await db.complaint.findFirst({
      where: { id: complaintId, tenantId, deletedAt: null },
      select: { id: true, title: true, priority: true, customerName: true },
    });

    if (!existingComplaint) {
      return res.status(404).json({ message: "Complaint not found or access denied" });
    }

    await db.$transaction(async (tx) => {
      const oldAssignments = await tx.assignment.findMany({ where: { complaintId, tenantId } });

      await tx.assignment.upsert({
        where: { complaintId },
        create: {
          tenantId,
          complaintId,
          assigneeType: "EMPLOYEE",
          employeeId,
          departmentId: employee.departmentId,
        },
        update: {
          employeeId,
          departmentId: employee.departmentId,
          assigneeType: "EMPLOYEE",
          assignedAt: new Date(),
        },
      });

      for (const old of oldAssignments) {
        if (old.employeeId && old.employeeId !== employeeId) {
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

    ComplaintsSocket.emitTicketAssigned(employee.userId, {
      complaintId,
      title: existingComplaint.title,
      priority: existingComplaint.priority,
      customerName: existingComplaint.customerName,
      message: `Complaint #${complaintId.substring(0, 7)} assigned to you: "${existingComplaint.title}"`,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({ message: "Complaint assigned directly to employee successfully" });
  } catch (err) {
    console.error("AssignToEmployee error:", err);
    return res.status(500).json({ message: "Internal server error assigning complaint to employee" });
  }
};

export const assignComplaintToDepartment = async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: Only administrators are authorized to assign or reassign tickets." });
  }

  const { complaintId, departmentId } = req.body as { complaintId: string; departmentId: string };

  if (!complaintId || !departmentId) {
    return res.status(400).json({ message: "complaintId and departmentId are required" });
  }

  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Validate target department belongs to tenant
    const department = await db.department.findFirst({
      where: { id: departmentId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!department) {
      return res.status(404).json({ message: "Department not found or access denied" });
    }

    // Validate complaint belongs to tenant
    const existingComplaint = await db.complaint.findFirst({
      where: { id: complaintId, tenantId, deletedAt: null },
      select: { id: true, title: true, priority: true, customerName: true },
    });

    if (!existingComplaint) {
      return res.status(404).json({ message: "Complaint not found or access denied" });
    }

    let assignedEmployeeUserId: string | null = null;

    await db.$transaction(async (tx) => {
      const oldAssignments = await tx.assignment.findMany({ where: { complaintId, tenantId } });

      // Automatically select the least-loaded employee in the chosen department
      const leastLoaded = await WorkloadService.selectLeastLoadedEmployee(tx, tenantId, departmentId);

      if (leastLoaded) {
        assignedEmployeeUserId = leastLoaded.userId;
        await tx.assignment.upsert({
          where: { complaintId },
          create: {
            tenantId,
            complaintId,
            assigneeType: "EMPLOYEE",
            employeeId: leastLoaded.id,
            departmentId,
          },
          update: {
            departmentId,
            employeeId: leastLoaded.id,
            assigneeType: "EMPLOYEE",
            assignedAt: new Date(),
          },
        });
        await WorkloadService.syncEmployeeLoad(tx, leastLoaded.id);
      } else {
        await tx.assignment.upsert({
          where: { complaintId },
          create: {
            tenantId,
            complaintId,
            assigneeType: "DEPARTMENT",
            departmentId,
            employeeId: null,
          },
          update: {
            departmentId,
            employeeId: null,
            assigneeType: "DEPARTMENT",
            assignedAt: new Date(),
          },
        });
      }

      for (const old of oldAssignments) {
        if (old.employeeId && (!leastLoaded || old.employeeId !== leastLoaded.id)) {
          await WorkloadService.syncEmployeeLoad(tx, old.employeeId);
        }
      }
    });

    ComplaintsSocket.emitTicketReassigned(tenantId, complaintId, {
      complaintId,
      assigneeType: "DEPARTMENT",
      departmentId,
    });

    if (assignedEmployeeUserId) {
      ComplaintsSocket.emitTicketAssigned(assignedEmployeeUserId, {
        complaintId,
        title: existingComplaint.title,
        priority: existingComplaint.priority,
        customerName: existingComplaint.customerName,
        message: `Complaint #${complaintId.substring(0, 7)} routed to you via department load balancing: "${existingComplaint.title}"`,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({ message: "Complaint assigned to department & routed to minimum-loaded staff member" });
  } catch (err) {
    console.error("AssignToDepartment error:", err);
    return res.status(500).json({ message: "Internal server error assigning complaint to department" });
  }
};
