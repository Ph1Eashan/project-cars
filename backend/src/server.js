const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const app = require("./app");
const connectDatabase = require("./config/database");
const { ensureDirectoryExists } = require("./utils/file.utils");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled promise rejection", {
    message: error?.message,
    stack: error?.stack
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

async function bootstrap() {
  ensureDirectoryExists("uploads");
  ensureDirectoryExists("tmp");

  await connectDatabase();

  const server = app.listen(PORT, () => {
    logger.info("Project Cars backend started", {
      port: PORT,
      environment: process.env.NODE_ENV || "development"
    });
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      logger.error("Server port is already in use", {
        port: PORT,
        message: `Port ${PORT} is already in use. Update PORT in your .env file or stop the conflicting process.`
      });
      process.exit(1);
    }

    logger.error("Server failed to listen", {
      port: PORT,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});
