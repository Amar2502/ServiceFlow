import { z } from "zod";

export const SubmitAiFeedbackSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID format"),
  isCorrectlyClassified: z.boolean(),
  correctedDepartmentId: z.string().uuid().optional(),
});

export type SubmitAiFeedbackInput = z.infer<typeof SubmitAiFeedbackSchema>;
