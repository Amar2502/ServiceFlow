import { z } from "zod";

export const EmployeeIdBodySchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID format"),
});

export const EmployeeIdParamSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID parameter format"),
});

export const MapDepartmentSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID format"),
  departmentId: z.string().uuid("Invalid department ID format"),
});

export const UpdateEmployeeNameSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID format"),
  name: z.string().min(2, "Employee name must be at least 2 characters"),
});

export const UpdateEmployeeTitleSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID format"),
  title: z.string().min(2, "Employee title must be at least 2 characters"),
});
