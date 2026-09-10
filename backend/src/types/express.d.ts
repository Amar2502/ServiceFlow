import "express";

export interface ApiKeyContext {
  id: string;
  name: string;
  tenantId: string;
  routingMode: "DEPARTMENT" | "EMPLOYEE";
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      authType?: "JWT" | "API_KEY";
      apiKey?: ApiKeyContext;
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

