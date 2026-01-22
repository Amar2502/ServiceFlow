import { Request, Response } from "express";
import pool from "../config/db";
import { config } from "../config/config";
import { hashPasswordDev } from "../utils/hash";
import jwt from "jsonwebtoken";

export const createInvite = async (req: Request, res: Response) => {
  const { role } = req.body as { role: string };
  const tenantId = req.user?.tenantId;

  if (!role || !tenantId) {
    res.status(400).json({ message: "Invalid credentials" });
    return;
  }

  const normalizedRole = role.trim().toUpperCase();

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const client = await pool.connect();

  try {
    const result = await client.query(
      "INSERT INTO invites (tenant_id, role, expires_at) VALUES ($1, $2, $3) RETURNING id, token, expires_at",
      [tenantId, normalizedRole, expiresAt]
    );

    res.status(201).json({
      id: result.rows[0].id,
      token: result.rows[0].token,
      expires_at: result.rows[0].expires_at,
      invite_url: `${config.FRONTEND_URL}/invite/${result.rows[0].token}`,
      message: "Invite created successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

export const loginWithInvite = async (req: Request, res: Response) => {
  const { name, email, password, token, title } = req.body as {
    name: string;
    email: string;
    password: string;
    token: string;
    title: string;
  };

  if (!name || !email || !password || !token || !title) {
    res.status(400).json({ message: "Invalid credentials" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const client = await pool.connect();

  try {
    const result = await client.query(
      "SELECT * FROM invites WHERE token = $1",
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ message: "Invalid token" });
      return;
    }

    const invite = result.rows[0];

    if (invite.expires_at < new Date()) {
      res.status(400).json({ message: "Invite expired" });
      return;
    }

    const passwordHash = hashPasswordDev(password);

    await client.query("BEGIN");
    await client.query("UPDATE invites SET used = TRUE WHERE id = $1", [
      invite.id,
    ]);
    const userResult = await client.query(
      "INSERT INTO users (tenant_id, email, password_hash, role, name) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [invite.tenant_id, normalizedEmail, passwordHash, invite.role, name]
    );

    const employeeResult = await client.query(
      "INSERT INTO employees (tenant_id, user_id, title) VALUES ($1, $2, $3) RETURNING id",
      [invite.tenant_id, userResult.rows[0].id, title]
    );

    await client.query("COMMIT");

    const authtoken: string = jwt.sign(
      { userId: userResult.rows[0].id, tenantId: invite.tenant_id },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.cookie("token", authtoken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ 
        userId: userResult.rows[0].id,
        tenantId: invite.tenant_id,
        employeeId: employeeResult.rows[0].id,
        token: authtoken,
        role: invite.role,
        message: "Invite login successful" });

    return;
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};
