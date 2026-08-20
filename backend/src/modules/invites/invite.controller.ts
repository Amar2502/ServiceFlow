import { Request, Response } from "express";
import { db } from "../../config/db";
import { InviteService } from "./invite.service";
import { config } from "../../config/config";
import jwt from "jsonwebtoken";
import { Role } from "../../generated/prisma";

export const createInvite = async (req: Request, res: Response) => {
  const { role, departmentId } = req.body as { role: string; departmentId?: string };
  const tenantId = req.user?.tenantId;

  if (!role || !tenantId) {
    res.status(400).json({ message: "Role and tenant authentication required" });
    return;
  }

  const normalizedRole = role.trim().toUpperCase() as Role;

  if (!["ADMIN", "AGENT"].includes(normalizedRole)) {
    res.status(400).json({ message: "Invalid role specified for invite" });
    return;
  }

  try {
    const inviteData = await InviteService.createInvite({
      tenantId,
      role: normalizedRole,
      departmentId,
    });

    res.status(201).json({
      id: inviteData.id,
      token: inviteData.token,
      role: inviteData.role,
      department_id: inviteData.department_id,
      expires_at: inviteData.expires_at,
      invite_url: inviteData.invite_url,
      message: "Single-use invitation token created and cached successfully",
    });
  } catch (err: any) {
    console.error("[CreateInvite Error]:", err);
    res.status(500).json({ message: "Internal server error creating invite" });
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
    res.status(400).json({ message: "All fields (name, email, password, token, title) are required" });
    return;
  }

  try {
    const result = await InviteService.redeemInvite({
      name,
      email,
      password,
      token,
      title,
    });

    const authtoken: string = jwt.sign(
      {
        userId: result.user.id,
        tenantId: result.tenantId,
        employeeId: result.employee.id,
        role: result.role,
      },
      config.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", authtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      userId: result.user.id,
      tenantId: result.tenantId,
      employeeId: result.employee.id,
      role: result.role,
      message: "Invitation redeemed and account registered successfully",
    });
  } catch (err: any) {
    const msg = err.message || "";
    if (msg === "INVALID_TOKEN") {
      res.status(400).json({ message: "Invalid invitation token" });
    } else if (msg === "INVITE_ALREADY_USED") {
      res.status(400).json({ message: "This invitation link has already been redeemed" });
    } else if (msg === "INVITE_EXPIRED") {
      res.status(400).json({ message: "This invitation link has expired" });
    } else if (msg === "EMAIL_ALREADY_EXISTS" || err.code === "P2002") {
      res.status(400).json({ message: "An account with this email address already exists in this organization" });
    } else {
      console.error("[LoginWithInvite Error]:", err);
      res.status(500).json({ message: "Internal server error redeeming invitation" });
    }
  }
};

export const getInviteTokenDetails = async (req: Request, res: Response) => {
  const { token } = req.params as { token: string };

  if (!token) {
    res.status(400).json({ valid: false, message: "Token parameter is required" });
    return;
  }

  try {
    const invite = await InviteService.getInviteByToken(token);

    if (!invite) {
      res.status(404).json({ valid: false, message: "Invalid invitation token" });
      return;
    }

    if (invite.used) {
      res.status(400).json({ valid: false, message: "This invitation link has already been redeemed" });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(400).json({ valid: false, message: "This invitation link has expired" });
      return;
    }

    const tenant = await db.tenant.findUnique({
      where: { id: invite.tenantId },
      select: { name: true },
    });

    res.status(200).json({
      valid: true,
      role: invite.role,
      tenantName: tenant?.name || "Organization",
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    console.error("[GetInviteTokenDetails Error]:", err);
    res.status(500).json({ valid: false, message: "Internal server error validating invitation" });
  }
};
