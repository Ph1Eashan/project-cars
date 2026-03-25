const logger = require("../utils/logger");

function notFoundHandler(req, res, next) {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const isOperational = statusCode < 500;

  logger[isOperational ? "warn" : "error"]("Request failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: error.message,
    stack: isOperational ? undefined : error.stack
  });

  res.status(statusCode).json({
    message: error.message || "Internal server error",
    details: error.details || null
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
