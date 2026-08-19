import { Router } from "express";
import { authRoutes } from "./modules/auth";
import { apiKeyRoutes } from "./modules/api-keys";
import { inviteRoutes } from "./modules/invites";
import { employeeRoutes } from "./modules/employees";
import { complaintRoutes } from "./modules/complaints";
import { tenantRoutes } from "./modules/tenants";
import { departmentRoutes } from "./modules/departments";
import { ticketMessageRoutes } from "./modules/ticket-messages";
import { analyticsRoutes } from "./modules/analytics";

export const masterRouter = Router();

masterRouter.use("/auth", authRoutes);
masterRouter.use("/apikey", apiKeyRoutes);
masterRouter.use("/invite", inviteRoutes);
masterRouter.use("/employees", employeeRoutes);
masterRouter.use("/complaints", complaintRoutes);
masterRouter.use("/tenant", tenantRoutes);
masterRouter.use("/departments", departmentRoutes);
masterRouter.use("/ticket-messages", ticketMessageRoutes);
masterRouter.use("/analytics", analyticsRoutes);
