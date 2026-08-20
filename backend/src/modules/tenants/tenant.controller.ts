import { Request, Response } from "express";
import { db } from "../../config/db";

export const updateTenantName = async (req: Request, res: Response) => {
  const { tenantId, name } = req.body as { tenantId?: string; name: string };
  const authTenantId = req.user?.tenantId;

  if (!authTenantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!name) {
    res.status(400).json({ message: "Tenant name is required" });
    return;
  }

  if (tenantId && tenantId !== authTenantId) {
    res.status(403).json({ message: "Forbidden: Cannot modify settings for another tenant" });
    return;
  }

  try {
    const tenant = await db.tenant.update({
      where: { id: authTenantId },
      data: { name },
      select: { id: true, name: true },
    });

    res.status(200).json({
      id: tenant.id,
      name: tenant.name,
      message: "Tenant updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTenantRoutingMode = async (req: Request, res: Response) => {
  const { tenantId, routingMode } = req.body as { tenantId?: string; routingMode: "DEPARTMENT" | "EMPLOYEE" };
  const authTenantId = req.user?.tenantId;

  if (!authTenantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!routingMode) {
    res.status(400).json({ message: "Routing mode is required" });
    return;
  }

  if (tenantId && tenantId !== authTenantId) {
    res.status(403).json({ message: "Forbidden: Cannot modify settings for another tenant" });
    return;
  }

  try {
    const tenant = await db.tenant.update({
      where: { id: authTenantId },
      data: { routingMode },
      select: { id: true, routingMode: true },
    });

    res.status(200).json({
      id: tenant.id,
      routing_mode: tenant.routingMode,
      message: "Tenant routing mode updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTenantDetails = async (req: Request, res: Response) => {
  const authTenantId = req.user?.tenantId;

  if (!authTenantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: authTenantId },
      select: { id: true, name: true, routingMode: true },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    res.status(200).json({
      id: tenant.id,
      name: tenant.name,
      routingMode: tenant.routingMode,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
