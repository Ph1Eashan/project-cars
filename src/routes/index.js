const express = require("express");

const repositoryRoutes = require("./repository.routes");
const simulationRoutes = require("./simulation.routes");

const router = express.Router();

router.use("/", repositoryRoutes);
router.use("/", simulationRoutes);

module.exports = router;
