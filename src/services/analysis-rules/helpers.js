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

function createRule({ name, category, weight, evaluate }) {
  return {
    name,
    category,
    weight,
    evaluate
  };
}

function buildRuleResult({
  passed,
  impact = 0,
  message,
  issues = []
}) {
  return {
    passed,
    impact,
    message,
    issues
  };
}

function buildFailedRule({
  weight,
  message,
  issues = [],
  impact
}) {
  return buildRuleResult({
    passed: false,
    impact: typeof impact === "number" ? impact : weight,
    message,
    issues
  });
}

function buildPassedRule(message) {
  return buildRuleResult({
    passed: true,
    impact: 0,
    message,
    issues: []
  });
}

function getFilesMatching(scanResult, patterns) {
  return scanResult.files
    .filter((file) => patterns.some((pattern) => pattern.test(file.content) || pattern.test(file.path)))
    .map((file) => file.path);
}

module.exports = {
  clampScore,
  buildIssue,
  createRule,
  buildRuleResult,
  buildFailedRule,
  buildPassedRule,
  getFilesMatching
};
