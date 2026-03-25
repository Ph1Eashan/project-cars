const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const routes = require("./routes");
const { requestLogger } = require("./middlewares/logging.middleware");
const {
  apiLimiter,
  corsOptions,
  requestSecurityContext
} = require("./middlewares/security.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(requestSecurityContext);
app.use(express.json({ limit: process.env.BODY_LIMIT || "10mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || "10mb" }));
app.use(requestLogger);
app.use(apiLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "project-cars-backend",
    environment: process.env.NODE_ENV || "development"
  });
});

app.use("/", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
