import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendProblemDetails } from "../utils/rfc7807";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const invalidParams = error.issues.map((issue) => ({
          name: issue.path.join("."),
          reason: issue.message,
        }));

        return sendProblemDetails(res, {
          type: "https://serviceflow.io/errors/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "One or more request parameters failed schema validation.",
          instance: req.originalUrl,
          invalid_params: invalidParams,
        });
      }
      next(error);
    }
  };
}
