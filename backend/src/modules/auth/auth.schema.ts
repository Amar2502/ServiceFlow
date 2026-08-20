import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tenantName: z.string().min(2, "Tenant name must be at least 2 characters"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
  tenantId: z.string().uuid("Invalid tenant ID format").optional(),
});
