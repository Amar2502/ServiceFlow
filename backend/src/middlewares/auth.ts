import { authenticateJwt, CustomJwtPayload } from "./role.middleware";

export type JwtPayload = CustomJwtPayload;
export const authmiddleware = authenticateJwt;

