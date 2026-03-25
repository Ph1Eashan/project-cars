const mongoose = require("mongoose");
const logger = require("../utils/logger");

function getDatabaseNameFromUri(mongoUri) {
  try {
    const parsedUrl = new URL(mongoUri);
    const pathname = parsedUrl.pathname.replace(/^\//, "");
    return pathname || null;
  } catch (error) {
    return null;
  }
}

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  const configuredDbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const dbName =
    configuredDbName || getDatabaseNameFromUri(mongoUri) || "project-cars";

  await mongoose.connect(mongoUri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  await mongoose.connection.db.admin().ping();

  logger.info("MongoDB connected", {
    host: mongoose.connection.host,
    database: mongoose.connection.name,
  });
}

module.exports = connectDatabase;
