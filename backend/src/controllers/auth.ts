import { Request, Response } from "express";
import pool from "../config/db";
import { comparePasswordDev, hashPasswordDev } from "../utils/hash";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

interface RegisterBody {
  email: string;
  password: string;
  tenantName: string;
  routingMode: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export const register = async (req: Request, res: Response) => {
  const { email, password, tenantName, routingMode } = req.body as RegisterBody;

  if (!email || !password || !tenantName || !routingMode) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  console.log(email, password, tenantName, routingMode);

  const normalizedEmail = email.trim().toLowerCase();
  
  const client = await pool.connect();

  try {

    const result = await client.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);

    if (result.rows.length > 0) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    await client.query("BEGIN");

    const tenantResult = await client.query(
      "INSERT INTO tenants (name, routing_mode) VALUES ($1, $2) RETURNING id",
      [tenantName, routingMode]
    );

    const tenantId = tenantResult.rows[0].id;

    const passwordHash = hashPasswordDev(password);

    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id`,
      [tenantId, normalizedEmail, passwordHash]
    );

    await client.query("COMMIT");

    console.log(userResult.rows[0].id);

    const token = jwt.sign({
        userId: userResult.rows[0].id,
        tenantId: tenantId,
        role: userResult.rows[0].role,
    }, 
    config.JWT_SECRET, 
    { expiresIn: "30d" }
    );  

    console.log(token);

    res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });

    console.log("User registered successfully");

    res.status(201).json({
      userId: userResult.rows[0].id,
      tenantId: tenantId,
      role: userResult.rows[0].role,
      message: "User registered successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

export const login = async (req: Request, res: Response) => {
    
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
        res.status(400).json({ message: "All fields are required" });
        return;
    }

    const client = await pool.connect();

    const normalizedEmail = email.trim().toLowerCase();

    try {

        const result = await client.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);

        if (result.rows.length === 0) {
            client.release();
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }

        const user = result.rows[0];

          const isPasswordValid = comparePasswordDev(password, user.password_hash);

        if (!isPasswordValid) {
            client.release();
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }

        const token = jwt.sign({
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.role,
        }, config.JWT_SECRET, { expiresIn: "30d" });

        res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });

        res.status(200).json({
            userId: user.id,
            tenantId: user.tenant_id,
            role: user.role,
            message: "Login successful",
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
    }
}