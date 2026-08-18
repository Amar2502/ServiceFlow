import cron, { ScheduledTask } from "node-cron";
import { SlaService } from "./sla.service";

export class SlaEscalationWorker {
  private static cronTask: ScheduledTask | null = null;

  /**
   * Initializes and starts background SLA escalation cron worker running every 5 minutes
   */
  static start(): void {
    if (this.cronTask) {
      console.log("[SLA Escalation Worker] Worker is already running.");
      return;
    }

    console.log("[SLA Escalation Worker] Starting background SLA cron worker (schedule: every 5 minutes)...");

    this.cronTask = cron.schedule("*/5 * * * *", async () => {
      console.log(`[SLA Escalation Worker Job] Running SLA breach check at ${new Date().toISOString()}...`);
      try {
        const result = await SlaService.checkAndEscalateBreachedSlas();
        if (result.breachedCount > 0) {
          console.log(
            `[SLA Escalation Worker Success] Escalated ${result.breachedCount} breached ticket(s).`,
            JSON.stringify(result.escalatedComplaints, null, 2)
          );
        } else {
          console.log("[SLA Escalation Worker Job] Zero SLA breaches detected. All SLA targets healthy.");
        }
      } catch (error) {
        console.error("[SLA Escalation Worker Job Failed]:", error);
      }
    });
  }

  /**
   * Gracefully stops the cron worker
   */
  static stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      console.log("[SLA Escalation Worker] Background worker stopped.");
    }
  }
}
