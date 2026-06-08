import { Request, Response, NextFunction } from "express";
import pool from "../config/db";
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

  console.log("keyHash from middleware", keyHash);

  console.log("apiKey from middleware", apiKey);

  const client = await pool.connect();

  try {
    // First, get the tenant_id for the api_key
    const apiKeyResult = await client.query(
      "SELECT tenant_id FROM api_keys WHERE key_hash = $1",
      [keyHash]
    );

    if (apiKeyResult.rows.length === 0) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    const tenantId = apiKeyResult.rows[0].tenant_id;

    // Now, get the routing_mode for the tenant
    const tenantResult = await client.query(
      "SELECT routing_mode FROM tenants WHERE id = $1",
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(401).json({ message: "Tenant not found" });
    }
    // Build a unified result object for the following code
    const result = {
        tenant_id: tenantId,
        routing_mode: tenantResult.rows[0].routing_mode
    };

    // attach tenant context
    req.user = {
      tenantId: result.tenant_id,
      routingMode: result.routing_mode as "DEPARTMENT" | "EMPLOYEE",
    };

    console.log("done from middleware");

    next();
  } catch {
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
