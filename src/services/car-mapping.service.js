const COMPONENT_RULE_MAP = {
  engine: ["performance.blocking-operations", "performance.chatty-database"],
  turbo: ["performance.missing-caching", "performance.large-service-surface"],
  brakes: ["reliability.missing-central-error-handler", "reliability.sparse-defensive-handling"],
  transmission: ["scalability.synchronous-flows", "scalability.monolith-coupling"],
  suspension: ["scalability.missing-queues", "scalability.stateful-implementation"],
  security: [
    "security.missing-auth",
    "security.missing-validation",
    "security.public-mutable-routes",
    "security.secret-leak-risk",
    "security.auth-without-validation"
  ]
};

function determineComponentStatus(failedRules) {
  if (failedRules.length === 0) {
    return "healthy";
  }

  const highestImpact = Math.max(...failedRules.map((rule) => rule.impact || 0));

  if (highestImpact >= 20) {
    return "broken";
  }

  return "weak";
}

function mapRuleResultsById(ruleResults = []) {
  return new Map(ruleResults.map((rule) => [rule.ruleId, rule]));
}

function mapRulesToCarState(ruleResults, componentRuleMap = COMPONENT_RULE_MAP) {
  const ruleResultMap = mapRuleResultsById(ruleResults);

  const car = Object.fromEntries(
    Object.entries(componentRuleMap).map(([component, ruleIds]) => {
      const mappedRules = ruleIds
        .map((ruleId) => ruleResultMap.get(ruleId))
        .filter(Boolean);

      if (mappedRules.length === 0) {
        return [
          component,
          {
            status: "missing",
            reasons: []
          }
        ];
      }

      const failedRules = mappedRules.filter((rule) => !rule.passed);
      return [
        component,
        {
          status: determineComponentStatus(failedRules),
          reasons: failedRules.map((rule) => ({
            rule: rule.name,
            message: rule.message
          }))
        }
      ];
    })
  );

  return { car };
}

function mapToCarView(analysisReport) {
  return mapRulesToCarState(analysisReport.results || []);
}

module.exports = {
  COMPONENT_RULE_MAP,
  mapRulesToCarState,
  mapToCarView
};
