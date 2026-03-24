const { createRule, buildIssue } = require("./helpers");

module.exports = [
  createRule({
    id: "reliability.missing-central-error-handler",
    title: "Centralized error handling is not clearly present",
    description: "Operational failures should be handled consistently.",
    severity: "high",
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0 || scanResult.errorHandlingSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "reliability",
          severity: "high",
          title: "Centralized error handling is not clearly present",
          description: "API routes were detected, but no explicit Express error middleware or similar global handler pattern was found.",
          recommendation: "Add centralized error middleware and standardized error responses.",
          ruleId: "reliability.missing-central-error-handler"
        })
      };
    }
  }),
  createRule({
    id: "reliability.sparse-defensive-handling",
    title: "Defensive error handling is sparse",
    description: "Error handling coverage should grow with API surface area.",
    severity: "medium",
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0) {
        return null;
      }

      const apiCount = scanResult.apis.length;
      const tryCatchCoverage = apiCount === 0 ? 0 : scanResult.tryCatchCount / apiCount;

      if (tryCatchCoverage >= 0.35 || scanResult.asyncWrapperSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "reliability",
          severity: "medium",
          title: "Defensive error handling looks sparse",
          description: `Only ${scanResult.tryCatchCount} try/catch blocks were found for ${apiCount} detected API routes.`,
          recommendation: "Wrap async handlers and convert operational errors into controlled responses.",
          ruleId: "reliability.sparse-defensive-handling"
        })
      };
    }
  }),
  createRule({
    id: "reliability.missing-health-signals",
    title: "Operational health signals are limited",
    description: "Production systems benefit from health and monitoring signals.",
    severity: "low",
    evaluate: (scanResult) => {
      if (scanResult.monitoringSignals.length > 0 || scanResult.healthEndpointSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "reliability",
          severity: "low",
          title: "Health or monitoring signals are limited",
          description: "No clear health endpoint, logging, or monitoring signals were identified in the scanned repository.",
          recommendation: "Add health checks, structured logging, and basic monitoring hooks.",
          ruleId: "reliability.missing-health-signals"
        })
      };
    }
  }),
  createRule({
    id: "reliability.retry-gap",
    title: "External call resilience signals are weak",
    description: "Retries and timeouts improve reliability for external dependencies.",
    severity: "low",
    evaluate: (scanResult) => {
      if (scanResult.externalCallSignals.length === 0 || scanResult.resilienceSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "reliability",
          severity: "low",
          title: "External dependency resilience patterns not detected",
          description: "HTTP or external client calls were found, but timeout, retry, or circuit-breaker style signals were not detected.",
          recommendation: "Add retries, timeouts, and fallback behavior around external service calls.",
          ruleId: "reliability.retry-gap"
        })
      };
    }
  })
];
