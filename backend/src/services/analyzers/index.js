const { analyzeNodeRepository } = require("./node.analyzer");
const { analyzeJavaRepository } = require("./java.analyzer");

module.exports = {
  analyzeJavaRepository,
  analyzeNodeRepository
};
