import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { masterRouter } from "./routes";
import { globalErrorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// Mount all feature module routers under /api
app.use("/api", masterRouter);

// Global RFC 7807 Problem Details Error Handler
app.use(globalErrorHandler);

export default app;