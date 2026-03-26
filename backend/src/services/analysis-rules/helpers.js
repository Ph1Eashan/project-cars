function clampScore(score) {
  return Math.max(0, Math.min(100, score));
}

const RECOMMENDATION_NORMALIZATION_RULES = [
  {
    pattern: /^Use asynchronous alternatives or move the work outside the request lifecycle\.?$/i,
    value: "Use asynchronous alternatives or move blocking work out of the request lifecycle."
  },
  {
    pattern: /^Move blocking work to async workflows, workers, or external processing layers\.?$/i,
    value: "Use asynchronous alternatives or move blocking work out of the request lifecycle."
  },
  {
    pattern: /^Review module boundaries and isolate independent workflows behind contracts or events\.?$/i,
    value: "Review module boundaries and isolate workflows behind clear contracts or events."
  },
  {
    pattern: /^Review query efficiency, batching, indexing, and repeated database round trips\.?$/i,
    value: "Review query efficiency, batching, indexing, and repeated database round trips."
  }
];

function normalizeRecommendation(recommendation) {
  if (!recommendation) {
    return null;
  }

  const trimmedRecommendation = recommendation.trim();
  if (!trimmedRecommendation) {
    return null;
  }

  const matchedRule = RECOMMENDATION_NORMALIZATION_RULES.find(({ pattern }) =>
    pattern.test(trimmedRecommendation)
  );

  return matchedRule ? matchedRule.value : trimmedRecommendation;
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
    recommendation: normalizeRecommendation(recommendation),
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
    recommendation: normalizeRecommendation(recommendation)
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
  getFilesMatching,
  normalizeRecommendation
};
