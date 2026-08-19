import { Response } from "express";

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface ProblemDetailsOptions {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalid_params?: InvalidParam[];
  [key: string]: any;
}

export function sendProblemDetails(res: Response, problem: ProblemDetailsOptions) {
  const payload = {
    type: problem.type || `https://serviceflow.io/errors/http-${problem.status}`,
    title: problem.title,
    status: problem.status,
    detail: problem.detail,
    message: problem.detail || problem.title,
    instance: problem.instance || res.req?.originalUrl,
    ...(problem.invalid_params && { invalid_params: problem.invalid_params }),
  };

  res.setHeader("Content-Type", "application/problem+json");
  return res.status(problem.status).json(payload);
}
