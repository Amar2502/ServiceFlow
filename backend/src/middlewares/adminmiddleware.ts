import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

interface JwtPayload {
    userId: string;
    tenantId: string;
    role: string;
}

export const adminmiddleware = (req: Request, res: Response, next: NextFunction) => {

  console.log("Admin Middleware");

    const token = req.cookies?.token;

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    if (decoded.role !== "ADMIN") {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
    };

    console.log("Admin Middleware Done");

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }

}