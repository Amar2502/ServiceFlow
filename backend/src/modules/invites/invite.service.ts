import { db } from "../../config/db";
import { redis } from "../../config/redis";
import { config } from "../../config/config";
import { Role } from "../../generated/prisma";
import { hashPassword } from "../../utils/hash";

export interface CreateInviteInput {
  tenantId: string;
  role: Role;
  departmentId?: string;
  title?: string;
}

export interface RedeemInviteInput {
  name: string;
  email: string;
  password: string;
  token: string;
  title?: string;
}

export class InviteService {
  /**
   * Generates a single-use invitation token.
   * Requirement 10: Contains employee title if role is AGENT and routing strategy is EMPLOYEE.
   * Requirement 11: Predefines department mapped to AGENT at creation time.
   */
  static async createInvite({ tenantId, role, departmentId, title }: CreateInviteInput) {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { routingMode: true },
    });

    const routingMode = tenant?.routingMode || "DEPARTMENT";

    let validDepartmentId: string | null = null;

    if (role === "AGENT") {
      if (routingMode === "DEPARTMENT") {
        if (!departmentId) {
          throw new Error("DEPARTMENT_REQUIRED_FOR_AGENT");
        }
      } else if (routingMode === "EMPLOYEE") {
        if (!title || !title.trim()) {
          throw new Error("TITLE_REQUIRED_FOR_EMPLOYEE_ROUTING");
        }
      }
    }

    if (departmentId) {
      const dept = await db.department.findFirst({
        where: { id: departmentId, tenantId, deletedAt: null },
        select: { id: true },
      });

      if (!dept) {
        throw new Error("INVALID_DEPARTMENT");
      }
      validDepartmentId = dept.id;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    const invite = await db.invite.create({
      data: {
        tenantId,
        role,
        departmentId: validDepartmentId,
        title: title ? title.trim() : null,
        expiresAt,
      },
      select: {
        id: true,
        token: true,
        role: true,
        departmentId: true,
        title: true,
        tenantId: true,
        expiresAt: true,
      },
    });

    // Cache single-use invite in Redis with 24-hour TTL (86400s)
    try {
      if (redis.status === "ready" || redis.status === "connecting") {
        await redis.set(
          `invite:${invite.token}`,
          JSON.stringify({
            id: invite.id,
            tenantId: invite.tenantId,
            role: invite.role,
            departmentId: invite.departmentId,
            title: invite.title,
            expiresAt: invite.expiresAt.toISOString(),
          }),
          "EX",
          86400
        );
      }
    } catch (err) {
      console.warn("[InviteService Redis Warning] Failed to cache invite in Redis, using DB fallback:", err);
    }

    return {
      id: invite.id,
      token: invite.token,
      role: invite.role,
      department_id: invite.departmentId,
      title: invite.title,
      expires_at: invite.expiresAt,
      invite_url: `${config.FRONTEND_URL}/invite/${invite.token}`,
    };
  }

  /**
   * Retrieves invite token details from database.
   */
  static async getInviteByToken(token: string) {
    const invite = await db.invite.findFirst({
      where: { token },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    return invite;
  }

  /**
   * Requirement 9: Single-use user-centric invite:
   * Redeems invite token, creates User and Employee profile, and DELETES the invite record!
   */
  static async redeemInvite({ name, email, password, token, title }: RedeemInviteInput) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Fetch token details
    const invite = await this.getInviteByToken(token);

    if (!invite) {
      throw new Error("INVALID_TOKEN");
    }

    // 2. Expiration Check
    if (invite.expiresAt < new Date()) {
      throw new Error("INVITE_EXPIRED");
    }

    // 3. Duplicate Email Check within Tenant
    const existingUser = await db.user.findFirst({
      where: {
        tenantId: invite.tenantId,
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(password);
    const finalTitle = invite.title || title || "Support Specialist";

    // 4. Atomic Prisma Transaction: Create user & employee, then DELETE the invite token
    const result = await db.$transaction(async (tx) => {
      let userRecord;
      try {
        userRecord = await tx.user.create({
          data: {
            tenantId: invite.tenantId,
            email: normalizedEmail,
            passwordHash,
            role: invite.role,
            name,
          },
        });
      } catch (err: any) {
        if (err.code === "P2002") {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }
        throw err;
      }

      const employeeRecord = await tx.employee.create({
        data: {
          tenantId: invite.tenantId,
          userId: userRecord.id,
          departmentId: invite.departmentId, // Auto-connected to Admin's predefined department
          title: finalTitle,
          name,
        },
      });

      // Requirement 9: Delete the invite record immediately upon redemption
      await tx.invite.delete({
        where: { id: invite.id },
      });

      return { user: userRecord, employee: employeeRecord };
    });

    // 5. Invalidate Redis cache entry
    try {
      if (redis.status === "ready") {
        await redis.del(`invite:${token}`);
      }
    } catch (err) {
      console.warn("[InviteService Redis Warning] Failed to delete invite token from Redis:", err);
    }

    return {
      user: result.user,
      employee: result.employee,
      tenantId: invite.tenantId,
      role: invite.role,
    };
  }
}
