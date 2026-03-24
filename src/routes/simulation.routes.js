const express = require("express");

const simulationController = require("../controllers/simulation.controller");
const validate = require("../middlewares/validation.middleware");
const { simulationSchema } = require("../utils/validation.schemas");

const router = express.Router();

router.post("/simulate", validate(simulationSchema), simulationController.simulateLoad);

module.exports = router;
