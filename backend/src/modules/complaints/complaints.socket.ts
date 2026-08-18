import { SocketEmitter } from "../../socket";

export class ComplaintsSocket {
  /**
   * Emits new ticket created event to all tenant dashboard clients
   */
  static emitTicketCreated(tenantId: string, payload: any): void {
    SocketEmitter.emitToTenant(tenantId, "ticket:created", payload);
  }

  /**
   * Emits direct ticket assignment alert to specific assigned agent
   */
  static emitTicketAssigned(userId: string, payload: any): void {
    SocketEmitter.emitToUser(userId, "ticket:assigned", payload);
  }

  /**
   * Emits ticket status change (open -> in_progress -> resolved) to tenant and ticket room
   */
  static emitTicketStatusChanged(tenantId: string, complaintId: string, payload: any): void {
    SocketEmitter.emitToTenant(tenantId, "ticket:status_changed", payload);
    SocketEmitter.emitToTicket(complaintId, "ticket:status_changed", payload);
  }

  /**
   * Emits ticket reassignment event to tenant and ticket room
   */
  static emitTicketReassigned(tenantId: string, complaintId: string, payload: any): void {
    SocketEmitter.emitToTenant(tenantId, "ticket:reassigned", payload);
    SocketEmitter.emitToTicket(complaintId, "ticket:reassigned", payload);
  }
}
