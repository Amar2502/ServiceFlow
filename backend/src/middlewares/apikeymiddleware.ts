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
    const result = await client.query(
      "SELECT tenant_id, routing_mode FROM api_keys WHERE key_hash = $1",
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    // attach tenant context
    req.user = {
      tenantId: result.rows[0].tenant_id,
      routingMode: result.rows[0].routing_mode as "DEPARTMENT" | "EMPLOYEE",
    };

    console.log("done from middleware");

    next();
  } catch {
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
