function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

function getSeverityWeight(severity) {
  const weights = {
    low: 8,
    medium: 15,
    high: 25
  };

  return weights[severity] || 10;
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

function createRule({ id, title, description, severity = "medium", evaluate }) {
  return {
    id,
    title,
    description,
    severity,
    evaluate
  };
}

function getFilesMatching(scanResult, patterns) {
  return scanResult.files
    .filter((file) => patterns.some((pattern) => pattern.test(file.content) || pattern.test(file.path)))
    .map((file) => file.path);
}

module.exports = {
  clampScore,
  getSeverityWeight,
  buildIssue,
  createRule,
  getFilesMatching
};
