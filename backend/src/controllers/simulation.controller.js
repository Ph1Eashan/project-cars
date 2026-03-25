const simulationService = require("../services/simulation.service");
const { asyncHandler } = require("../utils/async-handler");

const simulateLoad = asyncHandler(async (req, res) => {
  const result = await simulationService.simulate(req.body);

  res.status(200).json(result);
});

module.exports = {
  simulateLoad
};
