import { z } from "zod";

export const CreateDepartmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
});

export const DepartmentIdBodySchema = z.object({
  departmentId: z.string().uuid("Invalid department ID format"),
});
