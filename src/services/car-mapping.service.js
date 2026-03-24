function determineState(metric, strong = 80, warning = 55) {
  if (metric >= strong) {
    return "healthy";
  }

  if (metric >= warning) {
    return "weak";
  }

  return "critical";
}

function mapToCarView(architecture, analysisReport) {
  return {
    engine: determineState(analysisReport.scalability),
    gearSystem: determineState(analysisReport.performance),
    transmission: architecture.dependencies.length > 0 ? "healthy" : "missing",
    fuelTank: architecture.databaseInteractions.length > 0 ? "healthy" : "missing",
    brakes: determineState(analysisReport.security),
    chassis: determineState(analysisReport.reliability),
    dashboard: architecture.apis.length > 0 ? "healthy" : "weak"
  };
}

module.exports = {
  mapToCarView
};
