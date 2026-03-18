import { isHttpError } from "../utils/httpError.js";
import { logger } from "../utils/logger.js";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: "Not found" });
}

export function errorHandler(err, req, res, next) {
  const http = isHttpError(err) ? err : null;
  const status = http?.status ?? 500;

  const requestId = req.id;
  const payload = {
    requestId,
    message: http?.message ?? "Internal server error",
  };
  if (http?.details) payload.details = http.details;

  if (status >= 500) {
    logger.error({ err, requestId }, "Unhandled error");
  } else {
    logger.warn({ err: { message: err?.message }, requestId }, "Request error");
  }

  res.status(status).json({ success: false, ...payload });
}

