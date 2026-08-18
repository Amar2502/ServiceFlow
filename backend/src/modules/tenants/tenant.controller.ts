import { Request, Response } from "express";
import { db } from "../../config/db";

export const updateTenantName = async (req: Request, res: Response) => {
  const { tenantId, name } = req.body as { tenantId: string; name: string };

  if (!tenantId || !name) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const tenant = await db.tenant.update({
      where: { id: tenantId },
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
  const { tenantId, routingMode } = req.body as { tenantId: string; routingMode: "DEPARTMENT" | "EMPLOYEE" };

  if (!tenantId || !routingMode) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {
    const tenant = await db.tenant.update({
      where: { id: tenantId },
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
