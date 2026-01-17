const errorHandler = (err, req, res, next) => {
  // Default error values
  let error = {
    message: err.message || "Internal Server Error",
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  };

  // Log the error for debugging
  console.error("❌ Error occurred:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString(),
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    error.message = "Validation Error";
    error.statusCode = 400;
    error.details = err.details || err.message;
  }

  if (err.name === "CastError") {
    error.message = "Invalid ID format";
    error.statusCode = 400;
  }

  if (err.code === 11000) {
    error.message = "Duplicate field value entered";
    error.statusCode = 400;
  }

  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    error.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired";
    error.statusCode = 401;
  }

  if (err.name === "UnauthorizedError") {
    error.message = "Access denied";
    error.statusCode = 401;
  }

  if (err.name === "ForbiddenError") {
    error.message = "Forbidden";
    error.statusCode = 403;
  }

  if (err.name === "NotFoundError") {
    error.message = "Resource not found";
    error.statusCode = 404;
  }

  if (err.name === "PrismaClientKnownRequestError") {
    // Handle Prisma-specific errors
    switch (err.code) {
      case "P2002":
        error.message = "Unique constraint violation";
        error.statusCode = 400;
        break;
      case "P2025":
        error.message = "Record not found";
        error.statusCode = 404;
        break;
      case "P2003":
        error.message = "Foreign key constraint violation";
        error.statusCode = 400;
        break;
      default:
        error.message = "Database error";
        error.statusCode = 500;
    }
  }

  if (err.name === "PrismaClientValidationError") {
    error.message = "Validation error";
    error.statusCode = 400;
  }

  // Handle file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    error.message = "File too large";
    error.statusCode = 400;
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error.message = "Unexpected file field";
    error.statusCode = 400;
  }

  // Handle network and timeout errors
  if (err.code === "ECONNREFUSED") {
    error.message = "Database connection refused";
    error.statusCode = 503;
  }

  if (err.code === "ETIMEDOUT") {
    error.message = "Request timeout";
    error.statusCode = 408;
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details && { details: error.details }),
    ...(error.stack && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async error wrapper for async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class for throwing specific errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
};
