const path = require("path");
const multer = require("multer");

const { ensureDirectoryExists } = require("../utils/file.utils");

ensureDirectoryExists("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.includes("zip") || file.originalname.endsWith(".zip")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only zip uploads are supported"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024
  }
});
