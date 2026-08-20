import { Request, Response } from "express";
import { db } from "../../config/db";
import { comparePassword, hashPassword } from "../../utils/hash";
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
  tenantId?: string;
}

export const register = async (req: Request, res: Response) => {
  const { name, email, password, tenantName } = req.body as RegisterBody;

  if (!name || !email || !password || !tenantName) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const passwordHash = await hashPassword(password);

    const { user, employee, tenant } = await db.$transaction(async (tx) => {
      // Create new tenant organization
      const tenantRecord = await tx.tenant.create({
        data: { name: tenantName },
      });

      // Create Admin user within the new tenant organization (scoped to tenant.id)
      const userRecord = await tx.user.create({
        data: {
          tenantId: tenantRecord.id,
          name,
          email: normalizedEmail,
          passwordHash,
          role: "ADMIN",
        },
      });

      const employeeRecord = await tx.employee.create({
        data: {
          tenantId: tenantRecord.id,
          userId: userRecord.id,
          name,
          title: "Tenant Administrator",
        },
      });

      return { user: userRecord, employee: employeeRecord, tenant: tenantRecord };
    });

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        employeeId: employee.id,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      userId: user.id,
      tenantId: user.tenantId,
      employeeId: employee.id,
      role: user.role,
      routingMode: tenant.routingMode || "DEPARTMENT",
      tenantName: tenant.name,
      message: "Organization registered successfully",
    });
  } catch (err) {
    console.error("[Register Error]:", err);
    res.status(500).json({ message: "Internal server error registering organization" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password, tenantId } = req.body as LoginBody;

  if (!email || !password) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Query all user accounts linked to this email across tenants
    let candidateUsers = await db.user.findMany({
      where: { email: normalizedEmail },
    });

    if (candidateUsers.length === 0) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    if (tenantId) {
      candidateUsers = candidateUsers.filter((u) => u.tenantId === tenantId);
    }

    // Authenticate password against candidate tenant user accounts
    let authenticatedUser = null;
    for (const candidate of candidateUsers) {
      const isValid = await comparePassword(password, candidate.passwordHash);
      if (isValid) {
        authenticatedUser = candidate;
        break;
      }
    }

    if (!authenticatedUser) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const user = authenticatedUser;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
    });

    // Retrieve or auto-create active Employee profile for the user in this tenant
    let employee = await db.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId, deletedAt: null },
    });

    if (!employee) {
      employee = await db.employee.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          name: user.name || "Staff Member",
          title: user.role === "ADMIN" ? "Tenant Administrator" : "Support Agent",
        },
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        employeeId: employee.id,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      userId: user.id,
      tenantId: user.tenantId,
      employeeId: employee.id,
      role: user.role,
      routingMode: tenant?.routingMode || "DEPARTMENT",
      tenantName: tenant?.name || "",
      message: "Login successful",
    });
  } catch (err) {
    console.error("[Login Error]:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMeController = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const tenantId = req.user?.tenantId;

  if (!userId || !tenantId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    let employee = await db.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId, deletedAt: null },
    });

    if (!employee && user.role === "ADMIN") {
      employee = await db.employee.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          name: user.name || "Tenant Admin",
          title: "Tenant Administrator",
        },
      });
    }

    res.status(200).json({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
      email: user.email,
      employeeId: employee?.id || null,
      routingMode: user.tenant?.routingMode || "DEPARTMENT",
      tenantName: user.tenant?.name || "",
    });
  } catch (err) {
    console.error("[getMeController Error]:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
