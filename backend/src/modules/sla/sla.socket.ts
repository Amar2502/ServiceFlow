import { SocketEmitter } from "../../socket";

export class SlaSocket {
  /**
   * Emits SLA breach alerts to tenant admins and tenant dashboard
   */
  static emitSlaBreached(tenantId: string, payload: any): void {
    SocketEmitter.emitToAdmin(tenantId, "sla:breached", payload);
    SocketEmitter.emitToTenant(tenantId, "sla:breached", payload);
  }

  /**
   * Emits SLA impending breach warning alerts
   */
  static emitSlaWarning(tenantId: string, payload: any): void {
    SocketEmitter.emitToAdmin(tenantId, "sla:warning", payload);
  }
}
