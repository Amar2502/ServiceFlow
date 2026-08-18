import { z } from "zod";

export const UpdateTenantNameSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID format"),
  name: z.string().min(2, "Tenant name must be at least 2 characters"),
});

export const UpdateTenantRoutingModeSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID format"),
  routingMode: z.enum(["DEPARTMENT", "EMPLOYEE"], {
    message: "Routing mode must be 'DEPARTMENT' or 'EMPLOYEE'",
  }),
});
