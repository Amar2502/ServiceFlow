import { Request, Response, NextFunction } from "express";
import { db } from "../config/db";
import { hashApiKey } from "../utils/hash";

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing Bearer API token" });
  }

  const apiKey = authHeader.split(" ")[1];
  const keyHash = hashApiKey(apiKey);

  try {
    const apiKeyRecord = await db.apiKey.findFirst({
      where: { keyHash },
      select: {
        id: true,
        tenantId: true,
        tenant: {
          select: { routingMode: true },
        },
      },
    });

    if (!apiKeyRecord) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    if (!apiKeyRecord.tenant) {
      return res.status(401).json({ message: "Tenant not found" });
    }

    // Asynchronously update lastUsedAt timestamp for usage analytics
    db.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch((err) => {
      console.warn("[ApiKeyMiddleware Warning] Failed to update lastUsedAt timestamp:", err);
    });

    req.user = {
      tenantId: apiKeyRecord.tenantId,
      routingMode: apiKeyRecord.tenant.routingMode as "DEPARTMENT" | "EMPLOYEE",
      role: "ADMIN",
      name: "API Integration",
      email: "api@tenant",
    };

    next();
  } catch (err) {
    console.error("[ApiKeyMiddleware Error]:", err);
    res.status(500).json({ message: "Internal server error authenticating API key" });
  }
};
