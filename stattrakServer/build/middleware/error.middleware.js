"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const errors_1 = require("../utils/errors");
const config_1 = require("../config");
// 404 handler for unmatched routes
function notFoundHandler(req, res, next) {
    const error = new errors_1.AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
}
exports.notFoundHandler = notFoundHandler;
// Global error handler
function errorHandler(err, req, res, next) {
    // Default error values
    let statusCode = 500;
    let message = "Internal Server Error";
    let stack;
    // Handle known AppError instances
    if (err instanceof errors_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else if (err instanceof SyntaxError && "body" in err) {
        // JSON parse errors
        statusCode = 400;
        message = "Invalid JSON";
    }
    // Include stack trace in development
    if (config_1.config.nodeEnv === "development") {
        stack = err.stack;
        console.error(err);
    }
    res.status(statusCode).json({
        success: false,
        error: Object.assign({ message }, (stack && { stack })),
    });
}
exports.errorHandler = errorHandler;
