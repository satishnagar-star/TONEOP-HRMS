import { randomUUID } from "node:crypto";

export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}

