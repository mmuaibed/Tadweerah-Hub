import type { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "../lib/logger";

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: unknown, paramName: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new HttpError(400, "InvalidId", `Invalid ${paramName}`);
  }
  return value;
}

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  paramName: string,
): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new HttpError(400, "InvalidQuery", `Invalid ${paramName}`);
  }
  return value as T;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not Found", code: "NotFound" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }
  logger.error(
    { err, path: req.path, method: req.method },
    "Unhandled error",
  );
  res.status(500).json({ error: "Internal Server Error", code: "InternalError" });
};
