import { z } from "zod";

export const CreateComplaintSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  customerName: z.string().min(2, "Customer name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid customer email address"),
  externalReferenceId: z.string().optional(),
});

export const UpdateComplaintStatusSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID format"),
  status: z.enum(["open", "in_progress", "resolved"], {
    message: "Status must be 'open', 'in_progress', or 'resolved'",
  }),
});

export const ComplaintIdBodySchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID format"),
});

export const ComplaintIdParamSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID parameter format"),
});

export const AssignEmployeeSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID format"),
  employeeId: z.string().uuid("Invalid employee ID format"),
});

export const AssignDepartmentSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID format"),
  departmentId: z.string().uuid("Invalid department ID format"),
});
