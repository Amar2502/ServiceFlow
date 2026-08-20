import { Request, Response, NextFunction } from "express";
import { authenticateJwt, requireRole } from "./role.middleware";

export const adminmiddleware = (req: Request, res: Response, next: NextFunction) => {
  authenticateJwt(req, res, (err?: any) => {
    if (err) return next(err);
    requireRole("ADMIN")(req, res, next);
  });
};