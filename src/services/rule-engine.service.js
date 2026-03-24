const { clampScore } = require("./analysis-rules/helpers");

function normalizeRuleResult(rule, result) {
  const normalizedResult = result || {
    passed: true,
    impact: 0,
    message: "Rule passed.",
    issues: []
  };

  return {
    name: rule.name,
    category: rule.category,
    weight: rule.weight,
    passed: Boolean(normalizedResult.passed),
    impact: normalizedResult.passed ? 0 : Math.max(0, normalizedResult.impact || 0),
    message: normalizedResult.message || null,
    issues: normalizedResult.issues || [],
    ruleId: `${rule.category}.${rule.name}`,
    triggered: !normalizedResult.passed,
    scoreImpact: normalizedResult.passed ? 0 : Math.max(0, normalizedResult.impact || 0)
  };
}

function evaluateCategory(category, categoryConfig, scanResult) {
  const ruleResults = categoryConfig.rules.map((rule) => normalizeRuleResult(rule, rule.evaluate(scanResult)));
  const issues = ruleResults.flatMap((result) => result.issues);
  const totalImpact = ruleResults.reduce((sum, result) => sum + result.impact, 0);
  const triggeredRules = ruleResults.filter((result) => !result.passed).length;
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
  normalizeRuleResult,
  evaluateCategory,
  evaluateRuleSet
};
