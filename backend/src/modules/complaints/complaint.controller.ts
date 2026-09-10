import { Request, Response } from "express";
import { db } from "../../config/db";
import { ComplaintStatus } from "../../generated/prisma";
import { GroqService } from "./groq.service";
import { WorkloadService } from "./workload.service";
import { SlaService } from "../sla/sla.service";
import { ComplaintsSocket } from "./complaints.socket";
import { EmployeesSocket } from "../employees/employees.socket";
import { EmailService } from "../notifications/email.service";
import { sendProblemDetails } from "../../utils/rfc7807";

interface CreateComplaintBody {
  title: string;
  description?: string;
  customerName: string;
  customerEmail: string;
  externalReferenceId?: string;
}

interface FallbackTriageResult {
  selectedTarget?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  sentiment: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
  suggestedReply: string;
}

/**
 * Deterministic keyword & heuristic fallback triage when Groq AI is unavailable, rate-limited, or errored.
 * Guarantees 100% ticket ingestion uptime.
 */
function performKeywordFallbackTriage(
  complaintText: string,
  availableTargets: string[],
  routingMode: "DEPARTMENT" | "EMPLOYEE"
): FallbackTriageResult {
  const lower = complaintText.toLowerCase();

  // 1. Sentiment Heuristics
  let sentiment: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY" = "NEUTRAL";
  if (
    /furious|rage|terrible|awful|horrible|lawsuit|sue|fraud|scam|disaster|unacceptable|worst|disgusted|cheated|stolen/i.test(
      lower
    )
  ) {
    sentiment = "ANGRY";
  } else if (
    /frustrated|annoyed|disappointed|upset|delay|broken|fail|wrong|poor|issue|bug|problem|not working|glitch|error|slow|bad/i.test(
      lower
    )
  ) {
    sentiment = "FRUSTRATED";
  } else if (/thank|great|awesome|excellent|love|happy|good|appreciate|helpful/i.test(lower)) {
    sentiment = "HAPPY";
  }

  // 2. Priority Heuristics
  let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
  if (
    /urgent|emergency|asap|critical|immediate|outage|down|security|breach|exploit|p0|vulnerability|data leak|server down/i.test(
      lower
    )
  ) {
    priority = "URGENT";
  } else if (
    /high|important|blocker|cannot login|payment failed|money|charged twice|overcharged|production|escalat/i.test(
      lower
    )
  ) {
    priority = "HIGH";
  } else if (/low|minor|feedback|suggestion|feature request|typo|cosmetic/i.test(lower)) {
    priority = "LOW";
  }

  // 3. Target Selection (Keyword Matching & Heuristics)
  let selectedTarget: string | undefined = undefined;

  if (availableTargets.length > 0) {
    // Direct match check (if user mentions the target name directly)
    const directMatch = availableTargets.find((target) =>
      lower.includes(target.toLowerCase().trim())
    );

    if (directMatch) {
      selectedTarget = directMatch;
    } else {
      // Domain category keywords for department and employee title matching
      const domainKeywords: Record<string, string[]> = {
        billing: [
          "bill", "invoice", "charge", "refund", "subscription", "price", "pricing",
          "payment", "credit card", "bank", "receipt", "cost", "money", "overcharged", "fee", "payout"
        ],
        tech: [
          "tech", "bug", "error", "server", "crash", "code", "database", "api", "login",
          "broken", "500", "404", "glitch", "down", "stack", "deploy", "engineering", "developer", "system"
        ],
        sales: [
          "sales", "quote", "demo", "buy", "purchase", "enterprise", "plan", "upgrade",
          "lead", "deal", "pricing plan", "discount"
        ],
        support: [
          "help", "assist", "support", "service", "guide", "onboarding", "how to", "question", "portal", "account"
        ],
        legal: [
          "legal", "contract", "terms", "gdpr", "compliance", "privacy", "policy", "law", "attorney"
        ],
        operations: [
          "delivery", "shipping", "logistics", "order", "warehouse", "tracking", "package", "dispatch"
        ],
        hr: [
          "hr", "human resources", "payroll", "leave", "employee", "benefits", "hiring"
        ],
      };

      for (const [category, keywords] of Object.entries(domainKeywords)) {
        if (keywords.some((k) => lower.includes(k))) {
          const matchedTarget = availableTargets.find(
            (target) =>
              target.toLowerCase().includes(category) ||
              keywords.some((k) => target.toLowerCase().includes(k))
          );
          if (matchedTarget) {
            selectedTarget = matchedTarget;
            break;
          }
        }
      }

      // If no category matched, assign to first available target (deterministic default)
      if (!selectedTarget) {
        selectedTarget = availableTargets[0];
      }
    }
  }

  // 4. Default Professional Suggested Reply
  const suggestedReply =
    "Thank you for contacting our support team. We have received your complaint and a representative has been assigned to investigate and provide a swift resolution.";

  return {
    selectedTarget,
    priority,
    sentiment,
    suggestedReply,
  };
}

export const createComplaint = async (req: Request, res: Response) => {
  const { title, description, customerName, customerEmail, externalReferenceId } =
    req.body as CreateComplaintBody;

  const tenantId = req.apiKey?.tenantId || req.user?.tenantId;

  if (!title || !customerName || !customerEmail) {
    return res.status(400).json({ message: "All required fields (title, customerName, customerEmail) must be provided" });
  }

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized: Missing tenant context" });
  }

  // AI receives complaint title + complaint description in one text
  const complaintText = description ? `${title}\n${description}` : title;

  try {
    // -------------------------------------------------------------------------
    // 1. Pre-fetch Context & Targets Outside Database Transaction
    // -------------------------------------------------------------------------
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { routingMode: true },
    });

    const routingMode = tenant?.routingMode || "DEPARTMENT";

    let aiResult: {
      selected_target?: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      sentiment: "HAPPY" | "NEUTRAL" | "FRUSTRATED" | "ANGRY";
      suggested_reply: string;
      confidence: number;
      isFallback?: boolean;
    } = {
      priority: "MEDIUM",
      sentiment: "NEUTRAL",
      suggested_reply: "Thank you for contacting support. We will address your request shortly.",
      confidence: 0,
      isFallback: false,
    };

    let targetDepartment: any = null;
    let targetEmployee: any = null;

    // -------------------------------------------------------------------------
    // 2. Groq AI Classification with Fallback Triage (Outside Transaction)
    //    Prevents DB connection pool starvation and guarantees 100% ingestion uptime.
    // -------------------------------------------------------------------------
    if (routingMode === "EMPLOYEE") {
      const dbEmployees = await db.employee.findMany({
        where: { tenantId, deletedAt: null },
        include: { user: true, department: true },
      });

      const validEmployees = dbEmployees.filter(
        (e) => Boolean(e.title && e.title.trim())
      );

      if (validEmployees.length === 0) {
        aiResult = {
          priority: "MEDIUM",
          sentiment: "NEUTRAL",
          suggested_reply: "Thank you for contacting support. We will address your request shortly.",
          confidence: 0,
          isFallback: true,
        };
      } else {
        const employeeTitles = Array.from(
          new Set(validEmployees.map((e) => e.title!.trim()))
        );

        try {
          const classification = await GroqService.classifyEmployeeRouting(
            complaintText,
            employeeTitles
          );

          aiResult = {
            selected_target: classification.selected_employee_title,
            priority: classification.priority,
            sentiment: classification.sentiment,
            suggested_reply: classification.suggested_reply,
            confidence: classification.confidence,
            isFallback: false,
          };
        } catch (groqErr: any) {
          console.warn(
            `[Groq AI Fallback] Employee routing classification failed: ${groqErr?.message || groqErr}. Applying keyword/heuristic fallback triage.`
          );
          const fallback = performKeywordFallbackTriage(
            complaintText,
            employeeTitles,
            "EMPLOYEE"
          );
          aiResult = {
            selected_target: fallback.selectedTarget,
            priority: fallback.priority,
            sentiment: fallback.sentiment,
            suggested_reply: fallback.suggestedReply,
            confidence: 0.0,
            isFallback: true,
          };
        }

        if (aiResult.selected_target) {
          const matchingEmployees = validEmployees.filter(
            (e) =>
              e.title!.trim().toLowerCase() ===
              aiResult.selected_target!.toLowerCase()
          );

          if (matchingEmployees.length > 0) {
            matchingEmployees.sort((a, b) => a.load - b.load);
            targetEmployee = matchingEmployees[0];
          } else {
            targetEmployee = validEmployees[0];
          }
        } else {
          targetEmployee = validEmployees[0];
        }
      }
    } else {
      // DEPARTMENT routing mode
      const dbDepartments = await db.department.findMany({
        where: { tenantId, deletedAt: null },
      });

      if (dbDepartments.length === 0) {
        aiResult = {
          priority: "MEDIUM",
          sentiment: "NEUTRAL",
          suggested_reply: "Thank you for contacting support. We will address your request shortly.",
          confidence: 0,
          isFallback: true,
        };
      } else {
        const departmentNames = dbDepartments.map((d) => d.name.trim());

        try {
          const classification = await GroqService.classifyDepartmentRouting(
            complaintText,
            departmentNames
          );

          aiResult = {
            selected_target: classification.selected_department,
            priority: classification.priority,
            sentiment: classification.sentiment,
            suggested_reply: classification.suggested_reply,
            confidence: classification.confidence,
            isFallback: false,
          };
        } catch (groqErr: any) {
          console.warn(
            `[Groq AI Fallback] Department routing classification failed: ${groqErr?.message || groqErr}. Applying keyword/heuristic fallback triage.`
          );
          const fallback = performKeywordFallbackTriage(
            complaintText,
            departmentNames,
            "DEPARTMENT"
          );
          aiResult = {
            selected_target: fallback.selectedTarget,
            priority: fallback.priority,
            sentiment: fallback.sentiment,
            suggested_reply: fallback.suggestedReply,
            confidence: 0.0,
            isFallback: true,
          };
        }

        if (aiResult.selected_target) {
          targetDepartment =
            dbDepartments.find(
              (d) =>
                d.name.trim().toLowerCase() ===
                aiResult.selected_target!.toLowerCase()
            ) || dbDepartments[0];
        } else {
          targetDepartment = dbDepartments[0];
        }
      }
    }

    // Calculate exact SLA Due Timestamp based on Priority
    const slaDueAt = SlaService.calculateSlaDueAt(aiResult.priority);

    // Requirement threshold: confidence >= 0.75 without fallback is considered confident match
    const isConfidentMatch = !aiResult.isFallback && aiResult.confidence >= 0.75;
    const aiReasoning = aiResult.isFallback
      ? "Automated rule-based keyword & heuristic fallback triage applied (AI provider unavailable or rate limited)."
      : `AI classified with ${(aiResult.confidence * 100).toFixed(0)}% confidence score.`;

    // -------------------------------------------------------------------------
    // 3. Fast Atomic Database Transaction (Zero Network I/O Inside)
    // -------------------------------------------------------------------------
    const responsePayload = await db.$transaction(async (tx) => {
      // Create Complaint
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
          summary: title,
          suggestedReply: aiResult.suggested_reply,
          aiReasoning,
          aiConfidence: aiResult.confidence,
          slaDueAt,
          isSlaBreached: false,
          isCorrectlyClassified: isConfidentMatch,
        },
      });

      const complaintId = complaint.id;
      let assignmentData: any = null;

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

      return {
        message: "Complaint created and routed successfully",
        complaintId,
        customerEmail,
        customerName,
        title,
        routingMode,
        ai_triage: {
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          suggested_reply: aiResult.suggested_reply,
          confidence: aiResult.confidence,
          selected_target: aiResult.selected_target,
          is_fallback: Boolean(aiResult.isFallback),
        },
        sla: {
          due_at: slaDueAt,
          target_hours:
            aiResult.priority === "URGENT"
              ? 2
              : aiResult.priority === "HIGH"
              ? 6
              : aiResult.priority === "MEDIUM"
              ? 24
              : 48,
        },
        assignment: assignmentData,
      };
    });

    // -------------------------------------------------------------------------
    // 4. Real-Time Socket.io Event Emissions & Notifications
    // -------------------------------------------------------------------------
    ComplaintsSocket.emitTicketCreated(tenantId, responsePayload);

    if (responsePayload.assignment?.employee_id) {
      db.employee.findUnique({
        where: { id: responsePayload.assignment.employee_id },
        select: { load: true },
      }).then((emp) => {
        if (emp && responsePayload.assignment?.employee_id) {
          EmployeesSocket.emitLoadUpdated(tenantId, {
            employeeId: responsePayload.assignment.employee_id,
            load: emp.load,
          });
        }
      }).catch((e) => console.warn("Failed emitting load update on ticket create:", e));
    }

    // Admin notification: new complaint created and routed
    const targetInfo =
      responsePayload.routingMode === "EMPLOYEE"
        ? `employee "${responsePayload.assignment?.employee_name || responsePayload.ai_triage?.selected_target}"`
        : `department "${responsePayload.assignment?.department_name || responsePayload.ai_triage?.selected_target}"${
            responsePayload.assignment?.employee_name
              ? ` (assigned to ${responsePayload.assignment.employee_name})`
              : ""
          }`;

    ComplaintsSocket.emitAdminNotification(tenantId, {
      complaintId: responsePayload.complaintId,
      title: "New Complaint Created",
      message: `New complaint #${responsePayload.complaintId.substring(0, 7)} created and routed to ${targetInfo}.${
        responsePayload.ai_triage.is_fallback ? " (Fallback Triage Applied)" : ""
      }`,
      priority: responsePayload.ai_triage?.priority || "MEDIUM",
      customerName,
      timestamp: new Date().toISOString(),
    });

    // Assigned employee notification
    if (responsePayload.assignment?.employee_userId) {
      ComplaintsSocket.emitTicketAssigned(
        responsePayload.assignment.employee_userId,
        {
          complaintId: responsePayload.complaintId,
          title: responsePayload.title,
          priority: responsePayload.ai_triage?.priority || "MEDIUM",
          customerName: responsePayload.customerName,
          message: `A new complaint is assigned to you: #${responsePayload.complaintId.substring(
            0,
            7
          )} - "${title}"`,
          timestamp: new Date().toISOString(),
        }
      );
    }

    // Low confidence / Fallback alert for admin
    if (responsePayload.ai_triage.confidence < 0.75 || responsePayload.ai_triage.is_fallback) {
      const suggestionName =
        responsePayload.routingMode === "EMPLOYEE"
          ? responsePayload.ai_triage?.selected_target || "Employee"
          : responsePayload.ai_triage?.selected_target || "Department";

      ComplaintsSocket.emitAdminNotification(tenantId, {
        complaintId: responsePayload.complaintId,
        title: responsePayload.ai_triage.is_fallback
          ? "Fallback Routing Alert"
          : "Low AI Routing Confidence Alert",
        message: responsePayload.ai_triage.is_fallback
          ? `Complaint #${responsePayload.complaintId.substring(
              0,
              7
            )} was routed via fallback triage to ${suggestionName}. Please review and reassign if necessary.`
          : `Complaint #${responsePayload.complaintId.substring(
              0,
              7
            )} AI suggestion is ${suggestionName} (confidence: ${(
              responsePayload.ai_triage.confidence * 100
            ).toFixed(0)}%). Is this correct or assign yourself.`,
        priority: responsePayload.ai_triage?.priority || "MEDIUM",
        type: "low_confidence",
        confidence: responsePayload.ai_triage.confidence,
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
    return res
      .status(500)
      .json({ message: err.message || "Internal server error creating complaint" });
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

    const { updated, syncedLoads } = await db.$transaction(async (tx) => {
      const c = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
        },
      });

      const loads = await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
      return { updated: c, syncedLoads: loads };
    });

    WorkloadService.emitLoadUpdates(syncedLoads);

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
    return sendProblemDetails(res, {
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to fetch complaints.",
    });
  }

  const { page, limit, status, priority, search, paginated } = req.query;

  try {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (status && typeof status === "string" && status !== "ALL") {
      where.status = status;
    }

    if (priority && typeof priority === "string" && priority !== "ALL") {
      where.priority = priority;
    }

    if (search && typeof search === "string" && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { customerName: { contains: searchTerm, mode: "insensitive" } },
        { customerEmail: { contains: searchTerm, mode: "insensitive" } },
        { externalReferenceId: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const isPaginated = paginated === "true" || page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, complaints] = await Promise.all([
      db.complaint.count({ where }),
      db.complaint.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(isPaginated && { skip, take: limitNum }),
        include: {
          assignments: {
            orderBy: { assignedAt: "desc" },
            include: {
              employee: { include: { user: true } },
              department: true,
            },
          },
        },
      }),
    ]);

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

    if (isPaginated && paginated === "true") {
      const totalPages = Math.ceil(totalCount / limitNum);
      return res.status(200).json({
        data: formatted,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      });
    }

    return res.status(200).json(formatted);
  } catch (err) {
    console.error("GetAllComplaints error:", err);
    return sendProblemDetails(res, {
      status: 500,
      title: "Internal Server Error",
      detail: "Failed to fetch complaints list.",
    });
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

    const { updated, syncedLoads } = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id: complaintId },
        data: {
          status: status as ComplaintStatus,
          ...(status === "resolved" ? { resolvedAt: new Date() } : {}),
        },
      });

      const loads = await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
      return { updated: complaint, syncedLoads: loads };
    });

    // Sockets emitted safely AFTER transaction commits
    WorkloadService.emitLoadUpdates(syncedLoads);
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

    const syncedLoads = await db.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { deletedAt: new Date() },
      });

      return await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
    });

    WorkloadService.emitLoadUpdates(syncedLoads);
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

    const syncedLoads = await db.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id: complaintId },
        data: { deletedAt: null },
      });

      return await WorkloadService.syncComplaintEmployeeLoads(tx, complaintId);
    });

    WorkloadService.emitLoadUpdates(syncedLoads);
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

    const syncedLoads = await db.$transaction(async (tx) => {
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

      const loads = [];
      for (const old of oldAssignments) {
        if (old.employeeId && old.employeeId !== employeeId) {
          loads.push(await WorkloadService.syncEmployeeLoad(tx, old.employeeId));
        }
      }

      loads.push(await WorkloadService.syncEmployeeLoad(tx, employeeId));
      return loads;
    });

    WorkloadService.emitLoadUpdates(syncedLoads);

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

    const { assignedEmployeeUserId, syncedLoads } = await db.$transaction(async (tx) => {
      const oldAssignments = await tx.assignment.findMany({ where: { complaintId, tenantId } });

      // Automatically select the least-loaded employee in the chosen department (O(1) direct query)
      const leastLoaded = await WorkloadService.selectLeastLoadedEmployee(tx, tenantId, departmentId);
      let assignedUserId: string | null = null;
      const loads = [];

      if (leastLoaded) {
        assignedUserId = leastLoaded.userId;
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
        loads.push(await WorkloadService.syncEmployeeLoad(tx, leastLoaded.id));
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
          loads.push(await WorkloadService.syncEmployeeLoad(tx, old.employeeId));
        }
      }

      return { assignedEmployeeUserId: assignedUserId, syncedLoads: loads };
    });

    WorkloadService.emitLoadUpdates(syncedLoads);

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
