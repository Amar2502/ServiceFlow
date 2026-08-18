import http from "http";
import app from "./app";
import { config } from "./config/config";
import { db } from "./config/db";
import { SlaEscalationWorker } from "./modules/sla/sla.worker";
import { initSocketServer } from "./socket";

async function startServer() {
  try {
    await db.$connect();
    console.log("Database connected successfully");

    // Create HTTP Server & initialize Socket.io Real-Time WebSockets
    const server = http.createServer(app);
    initSocketServer(server);
    console.log("Socket.io Real-time WebSocket server initialized");

    // Start SLA Auto-Escalation Cron Worker (running every 5 minutes)
    SlaEscalationWorker.start();

    server.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();