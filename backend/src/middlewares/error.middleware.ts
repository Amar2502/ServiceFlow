import { Request, Response, NextFunction } from "express";
import { sendProblemDetails } from "../utils/rfc7807";

export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`[Unhandled API Error] ${req.method} ${req.originalUrl}:`, err);

  const status = typeof err.status === "number" ? err.status : 500;
  const message = err.message || "An unexpected internal server error occurred.";

  return sendProblemDetails(res, {
    type: `https://serviceflow.io/errors/http-${status}`,
    title: status === 500 ? "Internal Server Error" : "API Error",
    status,
    detail: message,
    instance: req.originalUrl,
  });
}
