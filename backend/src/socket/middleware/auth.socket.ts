import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
// @ts-ignore
import cookie from "cookie";
import { JwtPayload } from "../../modules/auth/auth.types";

export interface SocketUserData {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  employeeId?: string;
  name?: string;
  email?: string;
}

declare module "socket.io" {
  interface SocketData {
    user: SocketUserData;
  }
}

// Support both cookie.parse and cookie.parseCookie
const parseCookieFn = (cookie as any).parseCookie || (cookie as any).parse;
if (typeof (cookie as any).parseCookie !== "function" && typeof (cookie as any).parse === "function") {
  (cookie as any).parseCookie = (cookie as any).parse;
}

export const authSocket = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const rawCookie = socket.handshake.headers.cookie || "";
    const cookies = parseCookieFn ? parseCookieFn(rawCookie) : {};

    let token = cookies.token;

    // Fallbacks for auth token in payload or Bearer header
    if (!token && socket.handshake.auth && typeof socket.handshake.auth.token === "string") {
      token = socket.handshake.auth.token;
    }
    if (!token && socket.handshake.headers.authorization && socket.handshake.headers.authorization.startsWith("Bearer ")) {
      token = socket.handshake.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const secret = config.jwtSecret || config.JWT_SECRET;
    const decoded = jwt.verify(token, secret) as JwtPayload;

    socket.data.user = {
      id: decoded.userId,
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role ? decoded.role.toUpperCase() : "AGENT",
      employeeId: decoded.employeeId,
      name: decoded.name,
      email: decoded.email,
    };

    next();
  } catch {
    next(new Error("Invalid token"));
  }
};
