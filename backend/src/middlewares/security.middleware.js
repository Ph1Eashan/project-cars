const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { createRequestId } = require("../utils/request.utils");

function normalizeOrigins(value) {
  if (!value) {
    return ["http://localhost:3000"];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = normalizeOrigins(process.env.CLIENT_ORIGIN);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("Origin not allowed by CORS");
    error.statusCode = 403;
    callback(error);
  },
  credentials: true
};

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again later."
  }
});

function requestSecurityContext(req, res, next) {
  req.id = createRequestId();
  res.setHeader("X-Request-Id", req.id);
  next();
}

module.exports = {
  apiLimiter,
  corsOptions,
  requestSecurityContext
};
