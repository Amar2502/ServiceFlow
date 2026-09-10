import http from "http";
import app from "./app";
import { config } from "./config/config";
import { db } from "./config/db";
import { closeRedis } from "./config/redis";
import { SlaEscalationWorker } from "./modules/sla/sla.worker";
import { initSocketServer, closeSocketServer } from "./socket";

let server: http.Server | null = null;
let isShuttingDown = false;

async function startServer() {
  try {
    await db.$connect();
    console.log("[Database] Connected successfully via Prisma");

    // Create HTTP Server & initialize Socket.io Real-Time WebSockets
    server = http.createServer(app);
    initSocketServer(server);
    console.log("[Socket.io] Real-time WebSocket server initialized");

    // Start SLA Auto-Escalation Cron Worker (running every 5 minutes)
    SlaEscalationWorker.start();

    server.listen(config.PORT, () => {
      console.log(`[Server] ServiceFlow Backend is running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error("[Server] Startup failed:", error);
    process.exit(1);
  }
}

/**
 * Handles graceful shutdown upon SIGTERM or SIGINT signals
 */
async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

  // Force exit after 10s if graceful shutdown hangs
  const forceExitTimeout = setTimeout(() => {
    console.error("[Server] Graceful shutdown timeout (10s) exceeded. Forcing exit.");
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    // 1. Stop background SLA cron worker
    console.log("[Shutdown] 1/4 Stopping SLA escalation cron worker...");
    SlaEscalationWorker.stop();

    // 2. Disconnect and close active WebSocket connections
    console.log("[Shutdown] 2/4 Closing Socket.io WebSocket connections...");
    await closeSocketServer();

    // 3. Close HTTP Server (stops accepting new connections)
    console.log("[Shutdown] 3/4 Closing HTTP server...");
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      console.log("[Shutdown] HTTP server closed.");
    }

    // 4. Disconnect Prisma Database Connection Pool & Redis Client
    console.log("[Shutdown] 4/4 Closing Database pool & Redis connection...");
    await db.$disconnect();
    await closeRedis();
    console.log("[Shutdown] Database and Redis connections closed.");

    clearTimeout(forceExitTimeout);
    console.log("[Server] Graceful shutdown completed cleanly. Exiting (0).");
    process.exit(0);
  } catch (error) {
    console.error("[Server] Error during graceful shutdown:", error);
    process.exit(1);
  }
}

// Signal Listeners
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

// Global Uncaught Exception / Rejection Handlers
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Server] Uncaught Exception:", error);
  handleGracefulShutdown("uncaughtException");
});

startServer();