const { analyzeNodeRepository, getDetectedRoutes: getDetectedNodeRoutes } = require("./node.analyzer");
const { analyzeJavaRepository, getDetectedRoutes: getDetectedJavaRoutes } = require("./java.analyzer");

module.exports = {
  analyzeJavaRepository,
  analyzeNodeRepository,
  getDetectedJavaRoutes,
  getDetectedNodeRoutes
};
