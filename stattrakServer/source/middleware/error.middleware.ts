import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { config } from "../config";

// 404 handler for unmatched routes
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

// Global error handler
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Default error values
  let statusCode = 500;
  let message = "Internal Server Error";
  let stack: string | undefined;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof SyntaxError && "body" in err) {
    // JSON parse errors
    statusCode = 400;
    message = "Invalid JSON";
  }

  // Include stack trace in development
  if (config.nodeEnv === "development") {
    stack = err.stack;
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(stack && { stack }),
    },
  });
}
