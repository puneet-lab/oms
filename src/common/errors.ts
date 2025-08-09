export class HttpError extends Error {
  status: number;
  code: string;
  // details is safe, structured data (e.g., validation issues)
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
