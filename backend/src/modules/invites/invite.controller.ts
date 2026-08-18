import { Request, Response } from "express";
import { db } from "../../config/db";
import { config } from "../../config/config";
import { hashPasswordDev } from "../../utils/hash";
import jwt from "jsonwebtoken";
import { Role } from "../../generated/prisma";

export const createInvite = async (req: Request, res: Response) => {
  const { role } = req.body as { role: string };
  const tenantId = req.user?.tenantId;

  if (!role || !tenantId) {
    res.status(400).json({ message: "Invalid credentials" });
    return;
  }

  const normalizedRole = role.trim().toUpperCase() as Role;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    const invite = await db.invite.create({
      data: {
        tenantId,
        role: normalizedRole,
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
      },
    });

    res.status(201).json({
      id: invite.id,
      token: invite.token,
      expires_at: invite.expiresAt,
      invite_url: `${config.FRONTEND_URL}/invite/${invite.token}`,
      message: "Invite created successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
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

  try {
    const invite = await db.invite.findFirst({
      where: { token },
    });

    if (!invite) {
      res.status(400).json({ message: "Invalid token" });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(400).json({ message: "Invite expired" });
      return;
    }

    const passwordHash = hashPasswordDev(password);

    const { user, employee } = await db.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { used: true },
      });

      const userRecord = await tx.user.create({
        data: {
          tenantId: invite.tenantId,
          email: normalizedEmail,
          passwordHash,
          role: invite.role,
          name,
        },
      });

      const employeeRecord = await tx.employee.create({
        data: {
          tenantId: invite.tenantId,
          userId: userRecord.id,
          title,
          name,
        },
      });

      return { user: userRecord, employee: employeeRecord };
    });

    const authtoken: string = jwt.sign(
      {
        userId: user.id,
        tenantId: invite.tenantId,
        employeeId: employee.id,
        role: invite.role,
      },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", authtoken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      userId: user.id,
      tenantId: invite.tenantId,
      employeeId: employee.id,
      role: invite.role,
      message: "Invite login successful",
    });
    return;
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};
