import { Request, Response } from "express";
import { db } from "../../config/db";
import { comparePasswordDev, hashPasswordDev } from "../../utils/hash";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  tenantName: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export const register = async (req: Request, res: Response) => {
  const { name, email, password, tenantName } = req.body as RegisterBody;

  if (!name || !email || !password || !tenantName) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await db.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const passwordHash = hashPasswordDev(password);

    const user = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName },
      });

      return await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
        },
      });
    });

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });

    res.status(201).json({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      message: "User registered successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginBody;

  if (!email || !password) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await db.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = comparePasswordDev(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });

    res.status(200).json({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      message: "Login successful",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
