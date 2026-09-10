import { Request, Response, NextFunction } from "express";
import { db } from "../config/db";
import { hashApiKey } from "../utils/hash";
import { sendProblemDetails } from "../utils/rfc7807";

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendProblemDetails(res, {
      status: 401,
      title: "Unauthorized Access",
      detail: "Missing or malformed Authorization header. Expected 'Authorization: Bearer sf_live_...'",
    });
  }

  const apiKey = authHeader.split(" ")[1];
  if (!apiKey || !apiKey.trim()) {
    return sendProblemDetails(res, {
      status: 401,
      title: "Unauthorized Access",
      detail: "Bearer API key token cannot be empty.",
    });
  }

  const keyHash = hashApiKey(apiKey);

  try {
    const apiKeyRecord = await db.apiKey.findFirst({
      where: { keyHash },
      select: {
        id: true,
        name: true,
        tenantId: true,
        tenant: {
          select: { routingMode: true },
        },
      },
    });

    if (!apiKeyRecord) {
      return sendProblemDetails(res, {
        status: 401,
        title: "Invalid API Key",
        detail: "The provided API key is invalid or has been revoked.",
      });
    }

    if (!apiKeyRecord.tenant) {
      return sendProblemDetails(res, {
        status: 401,
        title: "Tenant Organization Not Found",
        detail: "The organization associated with this API key could not be resolved.",
      });
    }

    // Asynchronously update lastUsedAt timestamp for usage metrics
    db.apiKey
      .update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        console.warn("[ApiKeyMiddleware Warning] Failed to update lastUsedAt timestamp:", err);
      });

    // 1. Dedicated API Key identity context (No fake ADMIN user elevation)
    req.authType = "API_KEY";
    req.apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name || "API Integration",
      tenantId: apiKeyRecord.tenantId,
      routingMode: apiKeyRecord.tenant.routingMode as "DEPARTMENT" | "EMPLOYEE",
      permissions: ["complaints:write"],
    };

    // 2. Safe request user context without administrative privileges
    req.user = {
      tenantId: apiKeyRecord.tenantId,
      routingMode: apiKeyRecord.tenant.routingMode as "DEPARTMENT" | "EMPLOYEE",
      role: "API_KEY",
      name: `API Key: ${apiKeyRecord.name || "API Integration"}`,
    };

    next();
  } catch (err) {
    console.error("[ApiKeyMiddleware Error]:", err);
    return sendProblemDetails(res, {
      status: 500,
      title: "Internal Server Error",
      detail: "An unexpected error occurred while authenticating API key.",
    });
  }
};

