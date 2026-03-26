function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function buildIssue({
  category,
  severity,
  title,
  description,
  file = null,
  recommendation,
  ruleId
}) {
  return {
    category,
    severity,
    title,
    description,
    file,
    recommendation,
    ruleId
  };
}

function createRule({ name, category, weight, evaluate, rootCauseKey = null }) {
  return {
    name,
    category,
    weight,
    rootCauseKey,
    evaluate
  };
}

function buildRuleResult({
  passed,
  impact = 0,
  message,
  issues = [],
  recommendation = null
}) {
  return {
    passed,
    impact,
    message,
    issues,
    recommendation
  };
}

function buildFailedRule({
  weight,
  message,
  issues = [],
  impact,
  recommendation = null
}) {
  return buildRuleResult({
    passed: false,
    impact: typeof impact === "number" ? impact : weight,
    message,
    issues,
    recommendation
  });
}

function buildPassedRule(message, recommendation = null) {
  return buildRuleResult({
    passed: true,
    impact: 0,
    message,
    issues: [],
    recommendation
  });
}

function getFilesMatching(scanResult, patterns) {
  return scanResult.files
    .filter((file) => patterns.some((pattern) => pattern.test(file.content) || pattern.test(file.path)))
    .map((file) => file.path);
}

function formatRatio(count, total) {
  if (!total) {
    return "0%";
  }

  return `${Math.round((count / total) * 100)}%`;
}

module.exports = {
  clampScore,
  buildIssue,
  createRule,
  buildRuleResult,
  buildFailedRule,
  buildPassedRule,
  formatRatio,
  getFilesMatching
};
