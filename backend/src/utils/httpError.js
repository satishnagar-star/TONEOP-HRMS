export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function isHttpError(err) {
  return err && typeof err === "object" && err.name === "HttpError" && err.status;
}

