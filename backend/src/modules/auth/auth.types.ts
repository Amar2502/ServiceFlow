export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  employeeId?: string;
  name?: string;
  email?: string;
}
