import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId?: string;
        name?: string;
        email?: string;
        tenantId: string;
        role?: string;
        employeeId?: string;
        routingMode?: "DEPARTMENT" | "EMPLOYEE";
      };
    }
  }
}
