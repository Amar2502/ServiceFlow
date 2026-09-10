import cron, { ScheduledTask } from "node-cron";
import { SlaService } from "./sla.service";
import { redis, isRedisAvailable } from "../../config/redis";

export class SlaEscalationWorker {
  private static cronTask: ScheduledTask | null = null;
  private static readonly LOCK_KEY = "lock:cron:sla_escalation";
  private static readonly LOCK_TTL_SECONDS = 240; // 4 minutes auto-expiration safety

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
      console.log(`[SLA Escalation Worker Job] Cron triggered at ${new Date().toISOString()}`);

      let lockAcquired = false;

      // 1. Try to acquire Redis distributed lock to prevent duplicate execution across multiple containers
      if (isRedisAvailable()) {
        try {
          // SET key value EX 240 NX -> Only succeeds if key does not already exist
          const result = await redis.set(this.LOCK_KEY, "locked", "EX", this.LOCK_TTL_SECONDS, "NX");
          if (result !== "OK") {
            console.log("[SLA Escalation Worker] Another container instance is already processing this SLA run. Skipping on this node.");
            return;
          }
          lockAcquired = true;
        } catch (err: any) {
          console.warn(`[SLA Escalation Worker] Redis lock check failed (${err.message}). Proceeding locally.`);
        }
      }

      // 2. Perform SLA check & escalation
      try {
        console.log(`[SLA Escalation Worker Job] Checking for breached SLAs...`);
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
      } finally {
        // 3. Release lock when finished so next scheduled interval is clean
        if (lockAcquired && isRedisAvailable()) {
          try {
            await redis.del(this.LOCK_KEY);
          } catch (err: any) {
            console.warn(`[SLA Escalation Worker] Failed to release lock key: ${err.message}`);
          }
        }
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
      console.log("[SLA Escalation Worker] Background cron worker stopped.");
    }
  }
}

