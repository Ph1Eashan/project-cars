const { CATEGORY_CONFIG } = require("./analysis-rules");
const { evaluateRuleSet } = require("./rule-engine.service");

function generateReport(scanResult) {
  const ruleEvaluation = evaluateRuleSet(CATEGORY_CONFIG, scanResult);

  return {
    score: ruleEvaluation.overallScore,
    security: ruleEvaluation.categoryScores.security,
    performance: ruleEvaluation.categoryScores.performance,
    scalability: ruleEvaluation.categoryScores.scalability,
    reliability: ruleEvaluation.categoryScores.reliability,
    issues: ruleEvaluation.issues,
    breakdown: ruleEvaluation.breakdown
  };
}

module.exports = {
  generateReport
};
