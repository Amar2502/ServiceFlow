import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { config } from "../config/config";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [config.FRONTEND_URL, "http://localhost:3000"],
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Join tenant room
    socket.on("join:tenant", (tenantId: string) => {
      if (tenantId) {
        const room = `tenant:${tenantId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      }
    });

    // Join user/agent room
    socket.on("join:user", (userId: string) => {
      if (userId) {
        const room = `user:${userId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      }
    });

    // Join tenant admin room
    socket.on("join:admin", (tenantId: string) => {
      if (tenantId) {
        const room = `admin:${tenantId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
      }
    });

    // Join ticket conversation room
    socket.on("join:ticket", (complaintId: string) => {
      if (complaintId) {
        const room = `ticket:${complaintId}`;
        socket.join(room);
        console.log(`[Socket.io] Socket ${socket.id} joined room ${room}`);
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
