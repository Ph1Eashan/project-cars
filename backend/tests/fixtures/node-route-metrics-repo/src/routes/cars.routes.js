const express = require("express");

const metricsController = require("../controllers/metrics.controller");

const router = express.Router();

router.get("/cars", metricsController.listCars);
router.get("/health", metricsController.getHealth);
router.post("/slow-cars", metricsController.slowCars);

module.exports = router;
