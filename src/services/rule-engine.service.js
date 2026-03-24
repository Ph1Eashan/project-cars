const { clampScore, getSeverityWeight } = require("./analysis-rules/helpers");

function normalizeRuleResult(rule, category, result) {
  if (!result) {
    return {
      ruleId: rule.id,
      category,
      title: rule.title,
      description: rule.description,
      severity: rule.severity,
      triggered: false,
      scoreImpact: 0,
      issues: []
    };
  }

  const issues = result.issues || (result.issue ? [result.issue] : []);
  const scoreImpact =
    typeof result.scoreImpact === "number"
      ? result.scoreImpact
      : issues.reduce((total, issue) => total + getSeverityWeight(issue.severity), 0);

  return {
    ruleId: rule.id,
    category,
    title: rule.title,
    description: rule.description,
    severity: rule.severity,
    triggered: issues.length > 0,
    scoreImpact,
    issues
  };
}

function evaluateCategory(category, categoryConfig, scanResult) {
  const ruleResults = categoryConfig.rules.map((rule) =>
    normalizeRuleResult(rule, category, rule.evaluate(scanResult))
  );
  const issues = ruleResults.flatMap((result) => result.issues);
  const totalImpact = ruleResults.reduce((sum, result) => sum + result.scoreImpact, 0);
  const triggeredRules = ruleResults.filter((result) => result.triggered).length;
  const score = clampScore(100 - totalImpact);

  return {
    score,
    weight: categoryConfig.weight,
    totalImpact,
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
    issues: categoryEntries.flatMap(([, result]) => result.issues)
  };
}

module.exports = {
  normalizeRuleResult,
  evaluateCategory,
  evaluateRuleSet
};
