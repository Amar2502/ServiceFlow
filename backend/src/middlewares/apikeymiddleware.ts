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
    return res.status(401).json({ message: "Unauthorized" });
  }

  const apiKey = authHeader.split(" ")[1];
  const keyHash = hashApiKey(apiKey);

  try {
    const apiKeyRecord = await db.apiKey.findFirst({
      where: { keyHash },
      select: {
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

    req.user = {
      tenantId: apiKeyRecord.tenantId,
      routingMode: apiKeyRecord.tenant.routingMode as "DEPARTMENT" | "EMPLOYEE",
    };

    next();
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

