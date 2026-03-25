const express = require("express");

const upload = require("../config/multer");
const repositoryController = require("../controllers/repository.controller");
const validate = require("../middlewares/validation.middleware");
const {
  analyzeRepositorySchema,
  projectIdParamSchema
} = require("../utils/validation.schemas");

const router = express.Router();

router.post(
  "/analyze-repo",
  upload.single("zipFile"),
  validate(analyzeRepositorySchema),
  repositoryController.analyzeRepository
);

router.get("/rules", repositoryController.getRules);
router.get("/architecture/:id", validate(projectIdParamSchema, "params"), repositoryController.getArchitecture);
router.get("/analysis/:id", validate(projectIdParamSchema, "params"), repositoryController.getAnalysis);
router.get("/car-view/:id", validate(projectIdParamSchema, "params"), repositoryController.getCarView);

module.exports = router;
