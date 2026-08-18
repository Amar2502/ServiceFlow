import { SocketEmitter } from "../../socket";

export class EmployeesSocket {
  /**
   * Emits updated employee load counters to tenant dashboard
   */
  static emitLoadUpdated(tenantId: string, payload: { employeeId: string; load: number }): void {
    SocketEmitter.emitToTenant(tenantId, "load:updated", payload);
  }
}
