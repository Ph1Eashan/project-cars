const { CATEGORY_CONFIG } = require("./analysis-rules");
const { evaluateRuleSet } = require("./rule-engine.service");

function normalizeSummaryMessage(message) {
  if (!message) {
    return "";
  }

  const trimmed = message.trim().replace(/\.$/, "");
  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildTopIssues(ruleResults) {
  return ruleResults
    .filter((result) => !result.passed)
    .sort((left, right) => right.impact - left.impact)
    .slice(0, 3)
    .map((result) => ({
      rule: result.name,
      impact: result.impact,
      message: result.message
    }));
}

function buildSummary(ruleEvaluation) {
  const topIssues = buildTopIssues(ruleEvaluation.results);

  if (topIssues.length === 0) {
    return "Authentication, performance, scalability, and reliability checks all look healthy.";
  }

  const summaryParts = topIssues
    .slice(0, 2)
    .map((issue) => normalizeSummaryMessage(issue.message))
    .filter(Boolean);

  if (summaryParts.length === 0) {
    return "The analysis detected backend issues that should be reviewed.";
  }

  return `${summaryParts.join(" ")}.`;
}

function generateReport(scanResult) {
  const ruleEvaluation = evaluateRuleSet(CATEGORY_CONFIG, scanResult);
  const topIssues = buildTopIssues(ruleEvaluation.results);

  return {
    score: ruleEvaluation.overallScore,
    security: ruleEvaluation.categoryScores.security,
    performance: ruleEvaluation.categoryScores.performance,
    scalability: ruleEvaluation.categoryScores.scalability,
    reliability: ruleEvaluation.categoryScores.reliability,
    summary: buildSummary(ruleEvaluation),
    topIssues,
    issues: ruleEvaluation.issues,
    results: ruleEvaluation.results.map((result) => ({
      name: result.name,
      category: result.category,
      weight: result.weight,
      passed: result.passed,
      impact: result.impact,
      message: result.message,
      ruleId: result.ruleId
    })),
    breakdown: ruleEvaluation.breakdown
  };
}

module.exports = {
  generateReport
};
