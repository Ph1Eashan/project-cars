const {
  createRule,
  buildIssue,
  buildFailedRule,
  buildPassedRule
} = require("./helpers");

module.exports = [
  createRule({
    name: "missing-central-error-handler",
    category: "reliability",
    weight: 25,
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0 || scanResult.errorHandlingSignals.length > 0) {
        return buildPassedRule("Global error handling signals are present or no APIs were detected.");
      }

      return buildFailedRule({
        weight: 25,
        message: "API routes were detected, but no explicit global error middleware was found.",
        issues: [buildIssue({
          category: "reliability",
          severity: "high",
          title: "Centralized error handling is not clearly present",
          description: "API routes were detected, but no explicit Express error middleware or similar global handler pattern was found.",
          recommendation: "Add centralized error middleware and standardized error responses.",
          ruleId: "reliability.missing-central-error-handler"
        })]
      });
    }
  }),
  createRule({
    name: "sparse-defensive-handling",
    category: "reliability",
    weight: 15,
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0) {
        return buildPassedRule("No APIs detected, so defensive handler density is not applicable.");
      }

      const apiCount = scanResult.apis.length;
      const tryCatchCoverage = apiCount === 0 ? 0 : scanResult.tryCatchCount / apiCount;

      if (tryCatchCoverage >= 0.35 || scanResult.asyncWrapperSignals.length > 0) {
        return buildPassedRule("Defensive error handling coverage looks acceptable.");
      }

      return buildFailedRule({
        weight: 15,
        message: `Only ${scanResult.tryCatchCount} try/catch blocks were found for ${apiCount} detected API routes.`,
        issues: [buildIssue({
          category: "reliability",
          severity: "medium",
          title: "Defensive error handling looks sparse",
          description: `Only ${scanResult.tryCatchCount} try/catch blocks were found for ${apiCount} detected API routes.`,
          recommendation: "Wrap async handlers and convert operational errors into controlled responses.",
          ruleId: "reliability.sparse-defensive-handling"
        })]
      });
    }
  }),
  createRule({
    name: "missing-health-signals",
    category: "reliability",
    weight: 8,
    evaluate: (scanResult) => {
      if (scanResult.monitoringSignals.length > 0 || scanResult.healthEndpointSignals.length > 0) {
        return buildPassedRule("Operational health or monitoring signals are present.");
      }

      return buildFailedRule({
        weight: 8,
        message: "No clear health endpoint, logging, or monitoring signals were identified.",
        issues: [buildIssue({
          category: "reliability",
          severity: "low",
          title: "Health or monitoring signals are limited",
          description: "No clear health endpoint, logging, or monitoring signals were identified in the scanned repository.",
          recommendation: "Add health checks, structured logging, and basic monitoring hooks.",
          ruleId: "reliability.missing-health-signals"
        })]
      });
    }
  }),
  createRule({
    name: "retry-gap",
    category: "reliability",
    weight: 8,
    evaluate: (scanResult) => {
      if (scanResult.externalCallSignals.length === 0 || scanResult.resilienceSignals.length > 0) {
        return buildPassedRule("External dependency resilience signals are present or no external calls were found.");
      }

      return buildFailedRule({
        weight: 8,
        message: "External client calls were found, but timeout, retry, or circuit-breaker signals were not detected.",
        issues: [buildIssue({
          category: "reliability",
          severity: "low",
          title: "External dependency resilience patterns not detected",
          description: "HTTP or external client calls were found, but timeout, retry, or circuit-breaker style signals were not detected.",
          recommendation: "Add retries, timeouts, and fallback behavior around external service calls.",
          ruleId: "reliability.retry-gap"
        })]
      });
    }
  })
];
