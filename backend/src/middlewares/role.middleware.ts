import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { sendProblemDetails } from "../utils/rfc7807";

export interface CustomJwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  name?: string;
  email?: string;
}

/**
 * Authenticates JWT token from cookie or Authorization header and attaches req.user
 */
export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return sendProblemDetails(res, {
      type: "https://serviceflow.io/errors/unauthorized",
      title: "Unauthorized Access",
      status: 401,
      detail: "Authentication token required.",
      instance: req.originalUrl,
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as CustomJwtPayload;

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role ? decoded.role.toUpperCase() : "AGENT",
      name: decoded.name,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return sendProblemDetails(res, {
      type: "https://serviceflow.io/errors/invalid-token",
      title: "Invalid Authentication Token",
      status: 401,
      detail: "The provided JWT authentication token is invalid or expired.",
      instance: req.originalUrl,
    });
  }
};

/**
 * Strict Role Authorization Middleware: Enforces that req.user.role is in allowedRoles
 */
export function requireRole(...allowedRoles: ("ADMIN" | "AGENT")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendProblemDetails(res, {
        type: "https://serviceflow.io/errors/unauthorized",
        title: "Unauthorized Access",
        status: 401,
        detail: "Authentication token required.",
        instance: req.originalUrl,
      });
    }

    const userRole = (req.user.role || "AGENT").toUpperCase();
    const upperAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!upperAllowed.includes(userRole)) {
      return sendProblemDetails(res, {
        type: "https://serviceflow.io/errors/forbidden",
        title: "Forbidden Access",
        status: 403,
        detail: `Access denied. Endpoint requires one of the following roles: [${allowedRoles.join(
          ", "
        )}]. Your current role is '${userRole}'.`,
        instance: req.originalUrl,
      });
    }

    next();
  };
}
