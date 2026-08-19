import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  name?: string;
  email?: string;
}

export const adminmiddleware = (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Missing authentication token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    if (!decoded.role || decoded.role.toUpperCase() !== "ADMIN") {
      res.status(403).json({ message: "Forbidden: Admin role required" });
      return;
    }

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role.toUpperCase(),
      name: decoded.name,
      email: decoded.email,
    };

    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired authentication token" });
  }
};