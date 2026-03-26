const { clampScore } = require("./analysis-rules/helpers");

const SEVERITY_MULTIPLIERS = {
  low: 0.5,
  medium: 1,
  high: 1.5
};

function deriveSeverity(impact = 0) {
  if (impact >= 20) {
    return "high";
  }

  if (impact >= 10) {
    return "medium";
  }

  return "low";
}

function applySeverityWeight(impact = 0, severity = "low") {
  return Math.round(Math.max(0, impact) * (SEVERITY_MULTIPLIERS[severity] || SEVERITY_MULTIPLIERS.low));
}

function normalizeRuleResult(rule, result) {
  const normalizedResult = result || {
    passed: true,
    impact: 0,
    message: "Rule passed.",
    issues: [],
    recommendation: null
  };

  const impact = normalizedResult.passed ? 0 : Math.max(0, normalizedResult.impact || 0);
  const severity = deriveSeverity(impact);
  const recommendation =
    normalizedResult.recommendation ||
    normalizedResult.issues?.find((issue) => issue.recommendation)?.recommendation ||
    null;

  return {
    name: rule.name,
    category: rule.category,
    weight: rule.weight,
    rootCauseKey: rule.rootCauseKey || `${rule.category}.${rule.name}`,
    passed: Boolean(normalizedResult.passed),
    impact,
    severity,
    message: normalizedResult.message || null,
    recommendation,
    issues: normalizedResult.issues || [],
    ruleId: `${rule.category}.${rule.name}`,
    triggered: !normalizedResult.passed,
    scoreImpact: normalizedResult.passed ? 0 : applySeverityWeight(impact, severity)
  };
}

function evaluateCategory(category, categoryConfig, scanResult) {
  const ruleResults = categoryConfig.rules.map((rule) => normalizeRuleResult(rule, rule.evaluate(scanResult)));
  const issues = ruleResults.flatMap((result) => result.issues);
  const rawImpact = ruleResults.reduce((sum, result) => sum + result.impact, 0);
  const totalImpact = ruleResults.reduce((sum, result) => sum + result.scoreImpact, 0);
  const triggeredRules = ruleResults.filter((result) => !result.passed).length;
  const score = clampScore(100 - totalImpact);

  return {
    score,
    weight: categoryConfig.weight,
    totalImpact,
    rawImpact,
    triggeredRules,
    totalRules: ruleResults.length,
    issues,
    ruleResults
  };
}

function evaluateRuleSet(categoryConfigMap, scanResult) {
  const categoryEntries = Object.entries(categoryConfigMap).map(([category, config]) => [
    category,
    evaluateCategory(category, config, scanResult)
  ]);

  const weightedTotal = categoryEntries.reduce(
    (sum, [, result]) => sum + result.score * result.weight,
    0
  );
  const totalWeight = categoryEntries.reduce((sum, [, result]) => sum + result.weight, 0);

  const categoryScores = Object.fromEntries(
    categoryEntries.map(([category, result]) => [category, result.score])
  );

  const breakdown = Object.fromEntries(
    categoryEntries.map(([category, result]) => [
      category,
      {
        score: result.score,
        weight: result.weight,
        totalImpact: result.totalImpact,
        rawImpact: result.rawImpact,
        passedRules: result.totalRules - result.triggeredRules,
        triggeredRules: result.triggeredRules,
        totalRules: result.totalRules,
        rules: result.ruleResults
      }
    ])
  );

  return {
    overallScore: Math.round(weightedTotal / totalWeight),
    categoryScores,
    breakdown,
    issues: categoryEntries.flatMap(([, result]) => result.issues),
    results: categoryEntries.flatMap(([, result]) => result.ruleResults)
  };
}

module.exports = {
  applySeverityWeight,
  deriveSeverity,
  normalizeRuleResult,
  evaluateCategory,
  evaluateRuleSet
};
