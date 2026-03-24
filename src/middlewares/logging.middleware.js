const morgan = require("morgan");

const logger = require("../utils/logger");

morgan.token("request-id", (req) => req.id || "-");

const requestLogger = morgan((tokens, req, res) => {
  const payload = {
    requestId: tokens["request-id"](req, res),
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    statusCode: Number(tokens.status(req, res)),
    responseTimeMs: Number(tokens["response-time"](req, res)),
    contentLength: tokens.res(req, res, "content-length") || 0,
    ip: req.ip
  };

  logger.http("HTTP request", payload);
  return null;
});

module.exports = {
  requestLogger
};
