const projectService = require("./project.service");

function deriveStressLevel(loadScore) {
  if (loadScore < 40) {
    return "low";
  }

  if (loadScore < 75) {
    return "moderate";
  }

  return "high";
}

async function simulate({ users, projectId }) {
  let architecture = null;
  let analysis = null;

  if (projectId) {
    architecture = await projectService.getArchitectureByProjectId(projectId);
    analysis = await projectService.getAnalysisByProjectId(projectId);
  }

  // This is an intentionally simple estimator that turns architecture size and quality
  // signals into a stress score without running a real benchmark engine.
  const apiLoadFactor = architecture ? architecture.apis.length * 4 : 12;
  const serviceLoadFactor = architecture ? architecture.services.length * 3 : 10;
  const databaseLoadFactor = architecture ? architecture.databaseInteractions.length * 2 : 8;
  const reliabilityPenalty = analysis ? (100 - analysis.reliability) * 0.4 : 12;

  const rawStress = Math.round(users * 0.08 + apiLoadFactor + serviceLoadFactor + databaseLoadFactor + reliabilityPenalty);
  const normalizedStress = Math.min(100, rawStress);
  const bottlenecks = [];
  const warnings = [];

  if (apiLoadFactor > 20) {
    bottlenecks.push("API layer saturation risk");
  }

  if (databaseLoadFactor > 18) {
    bottlenecks.push("Database connection pressure");
  }

  if (!analysis || analysis.scalability < 70) {
    warnings.push("Background processing and horizontal scaling look limited under peak load.");
  }

  if (!analysis || analysis.performance < 75) {
    warnings.push("Caching or non-blocking optimizations may be needed before traffic spikes.");
  }

  if (users > 1000) {
    warnings.push("Traffic exceeds the safe default threshold for a single-node deployment.");
  }

  return {
    users,
    predictedSystemStress: normalizedStress,
    stressLevel: deriveStressLevel(normalizedStress),
    bottlenecks,
    warnings
  };
}

module.exports = {
  simulate
};
