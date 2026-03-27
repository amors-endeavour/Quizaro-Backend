// Custom error class for handling operational errors

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;

    // Fail → 4xx, Error → 5xx
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";

    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;