import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { config } from "../config/config";
import { db } from "../config/db";
import { authSocket } from "./middleware/auth.socket";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [config.FRONTEND_URL, "http://localhost:3000"],
      credentials: true,
    },
  });

  // Socket.io Authentication Middleware
  io.use(authSocket);

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;
    const userId = user.userId || user.id;
    console.log(`[Socket.io] Client connected: ${socket.id} (User: ${userId}, Tenant: ${user.tenantId})`);

    // Auto-join authenticated user's tenant room
    if (user.tenantId) {
      const defaultTenantRoom = `tenant:${user.tenantId}`;
      socket.join(defaultTenantRoom);
      console.log(`[Socket.io] Socket ${socket.id} auto-joined room ${defaultTenantRoom}`);
    }

    // Auto-join authenticated user's personal room
    if (userId) {
      const defaultUserRoom = `user:${userId}`;
      socket.join(defaultUserRoom);
    }

    // Auto-join tenant admin room if role is ADMIN
    if (user.role === "ADMIN" && user.tenantId) {
      const defaultAdminRoom = `admin:${user.tenantId}`;
      socket.join(defaultAdminRoom);
      console.log(`[Socket.io] Socket ${socket.id} auto-joined room ${defaultAdminRoom}`);
    }

    // Join tenant room (with tenant authorization check)
    socket.on("join:tenant", (tenantId: string) => {
      if (tenantId === user.tenantId) {
        const room = `tenant:${tenantId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      } else {
        console.warn(`[Socket.io Security Warning] Unauthorized join:tenant attempt by user ${userId} for tenant ${tenantId}`);
      }
    });

    // Join user room (with user authorization check)
    socket.on("join:user", (reqUserId: string) => {
      if (reqUserId === userId) {
        const room = `user:${reqUserId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      } else {
        console.warn(`[Socket.io Security Warning] Unauthorized join:user attempt by user ${userId} for userId ${reqUserId}`);
      }
    });

    // Join tenant admin room (with admin role & tenant authorization check)
    socket.on("join:admin", (tenantId: string) => {
      if (tenantId === user.tenantId && user.role === "ADMIN") {
        const room = `admin:${tenantId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      } else {
        console.warn(`[Socket.io Security Warning] Unauthorized join:admin attempt by user ${userId} (Role: ${user.role}) for tenant ${tenantId}`);
      }
    });

    // Join ticket conversation room (with ticket tenant authorization check)
    socket.on("join:ticket", async (complaintId: string) => {
      if (!complaintId) return;
      try {
        const complaint = await db.complaint.findUnique({
          where: { id: complaintId },
          select: { tenantId: true },
        });

        if (complaint && complaint.tenantId === user.tenantId) {
          const room = `ticket:${complaintId}`;
          socket.join(room);
          console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
        } else {
          console.warn(`[Socket.io Security Warning] Unauthorized join:ticket attempt by user ${userId} for complaint ${complaintId}`);
        }
      } catch (err) {
        console.error(`[Socket.io Error] Failed verifying ticket ownership for socket ${socket.id}:`, err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io server has not been initialized yet.");
  }
  return io;
}

export class SocketEmitter {
  static emitToTenant(tenantId: string, event: string, payload: any): void {
    if (io) {
      io.to(`tenant:${tenantId}`).emit(event, payload);
    }
  }

  static emitToUser(userId: string, event: string, payload: any): void {
    if (io) {
      io.to(`user:${userId}`).emit(event, payload);
    }
  }

  static emitToAdmin(tenantId: string, event: string, payload: any): void {
    if (io) {
      io.to(`admin:${tenantId}`).emit(event, payload);
    }
  }

  static emitToTicket(complaintId: string, event: string, payload: any): void {
    if (io) {
      io.to(`ticket:${complaintId}`).emit(event, payload);
    }
  }

  static broadcast(event: string, payload: any): void {
    if (io) {
      io.emit(event, payload);
    }
  }
}
