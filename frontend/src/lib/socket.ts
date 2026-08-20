import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}

export function joinTenantRoom(tenantId: string) {
  const s = getSocket();
  if (tenantId) {
    s.emit("join:tenant", tenantId);
  }
}

export function joinUserRoom(userId: string) {
  const s = getSocket();
  if (userId) {
    s.emit("join:user", userId);
  }
}

export function joinAdminRoom(tenantId: string) {
  const s = getSocket();
  if (tenantId) {
    s.emit("join:admin", tenantId);
  }
}

export function joinTicketRoom(complaintId: string) {
  const s = getSocket();
  if (complaintId) {
    s.emit("join:ticket", complaintId);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
