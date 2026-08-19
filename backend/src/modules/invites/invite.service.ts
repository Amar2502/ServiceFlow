import { db } from "../../config/db";
import { redis } from "../../config/redis";
import { config } from "../../config/config";
import { Role } from "../../generated/prisma";
import { hashPassword } from "../../utils/hash";

export interface CreateInviteInput {
  tenantId: string;
  role: Role;
  departmentId?: string;
}

export interface RedeemInviteInput {
  name: string;
  email: string;
  password: string;
  token: string;
  title: string;
}

export class InviteService {
  /**
   * Generates a single-use invitation token with Admin-specified role and department,
   * stores it in Prisma DB, and caches it in Redis for sub-millisecond lookup.
   */
  static async createInvite({ tenantId, role, departmentId }: CreateInviteInput) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    // Validate department belongs to tenant if provided
    let validDepartmentId: string | null = null;
    if (departmentId) {
      const dept = await db.department.findFirst({
        where: { id: departmentId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (dept) validDepartmentId = dept.id;
    }

    const invite = await db.invite.create({
      data: {
        tenantId,
        role,
        departmentId: validDepartmentId,
        expiresAt,
        used: false,
      },
      select: {
        id: true,
        token: true,
        role: true,
        departmentId: true,
        tenantId: true,
        expiresAt: true,
        used: true,
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
            expiresAt: invite.expiresAt.toISOString(),
            used: false,
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
      expires_at: invite.expiresAt,
      invite_url: `${config.FRONTEND_URL}/invite/${invite.token}`,
    };
  }

  /**
   * Retrieves invite token details from Redis cache with DB fallback.
   */
  static async getInviteByToken(token: string) {
    try {
      if (redis.status === "ready") {
        const cached = await redis.get(`invite:${token}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            id: parsed.id,
            tenantId: parsed.tenantId,
            role: parsed.role as Role,
            departmentId: parsed.departmentId as string | null,
            expiresAt: new Date(parsed.expiresAt),
            used: Boolean(parsed.used),
          };
        }
      }
    } catch (err) {
      console.warn("[InviteService Redis Warning] Failed to read cached invite token:", err);
    }

    // Database Fallback
    const invite = await db.invite.findFirst({
      where: { token },
      select: {
        id: true,
        tenantId: true,
        role: true,
        departmentId: true,
        expiresAt: true,
        used: true,
      },
    });

    return invite;
  }

  /**
   * Redeems a single-use invitation token atomically.
   * Auto-connects the newly registered employee to the Admin's pre-selected department.
   */
  static async redeemInvite({ name, email, password, token, title }: RedeemInviteInput) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Fetch token details (Redis cache or DB fallback)
    const invite = await this.getInviteByToken(token);

    if (!invite) {
      throw new Error("INVALID_TOKEN");
    }

    // 2. SINGLE-USE CHECK: Reject if token has already been redeemed
    if (invite.used) {
      throw new Error("INVITE_ALREADY_USED");
    }

    // 3. Expiration Check
    if (invite.expiresAt < new Date()) {
      throw new Error("INVITE_EXPIRED");
    }

    // 4. Duplicate Email Check within Tenant
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

    // 5. Atomic Prisma Transaction: Mark token as used, create user & auto-linked employee profile
    const result = await db.$transaction(async (tx) => {
      const updateResult = await tx.invite.updateMany({
        where: {
          id: invite.id,
          used: false,
        },
        data: { used: true },
      });

      if (updateResult.count === 0) {
        throw new Error("INVITE_ALREADY_USED");
      }

      let userRecord;
      try {
        userRecord = await tx.user.create({
          data: {
            tenantId: invite.tenantId,
            email: normalizedEmail,
            passwordHash,
            role: invite.role, // Admin-assigned role enforced
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
          departmentId: invite.departmentId, // Auto-connected to Admin's pre-selected department
          title,
          name,
        },
      });

      return { user: userRecord, employee: employeeRecord };
    });

    // 6. Invalidate Redis cache entry
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
