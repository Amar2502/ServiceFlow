import app from "./app";
import { config } from "./config/config";
import { db } from "./config/db";

async function startServer() {
  try {
    await db.$connect();
    console.log("Database connected successfully");

    app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}


startServer();