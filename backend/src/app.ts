import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "./config/config";
import { masterRouter } from "./routes";
import { globalErrorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  config.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server API intake)
      if (!origin) return callback(null, true);

      // Allow configured frontend, localhost, or any Vercel preview/production deployment
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (config.FRONTEND_URL && origin === config.FRONTEND_URL);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

// Mount all feature module routers under /api
app.use("/api", masterRouter);

// Global RFC 7807 Problem Details Error Handler
app.use(globalErrorHandler);

export default app;