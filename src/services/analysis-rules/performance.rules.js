const {
  createRule,
  buildIssue,
  buildFailedRule,
  buildPassedRule,
  buildRuleResult
} = require("./helpers");

module.exports = [
  createRule({
    name: "blocking-operations",
    category: "performance",
    weight: 8,
    evaluate: (scanResult) => {
      if (scanResult.blockingPatterns.length === 0) {
        return buildPassedRule("No blocking synchronous patterns were detected.");
      }

      return buildRuleResult({
        passed: false,
        impact: Math.min(30, scanResult.blockingPatterns.length * 8),
        message: "Synchronous operations were found in code that may impact request latency.",
        issues: scanResult.blockingPatterns.map((item) =>
          buildIssue({
            category: "performance",
            severity: "medium",
            title: "Potential blocking operation detected",
            description: `Synchronous pattern "${item.pattern}" was found in code that may run on the request path.`,
            file: item.file,
            recommendation: "Use asynchronous alternatives or move the work outside the request lifecycle.",
            ruleId: "performance.blocking-operations"
          })
        )
      });
    }
  }),
  createRule({
    name: "missing-caching",
    category: "performance",
    weight: 8,
    evaluate: (scanResult) => {
      const isReadHeavy = scanResult.apis.filter((api) => api.method === "GET").length >= 3;

      if (!isReadHeavy || scanResult.cachingSignals.length > 0) {
        return buildPassedRule("Caching coverage is present or the API surface is not read-heavy.");
      }

      return buildFailedRule({
        weight: 8,
        message: "Several GET endpoints were found, but no cache-related implementation was detected.",
        issues: [buildIssue({
          category: "performance",
          severity: "low",
          title: "Caching layer not detected",
          description: "Several GET endpoints were found, but no cache-related libraries or cache headers were identified.",
          recommendation: "Consider endpoint or query caching for expensive read paths.",
          ruleId: "performance.missing-caching"
        })]
      });
    }
  }),
  createRule({
    name: "chatty-database",
    category: "performance",
    weight: 15,
    evaluate: (scanResult) => {
      if (scanResult.databaseInteractions.length < 6) {
        return buildPassedRule("Database interaction density looks manageable.");
      }

      return buildFailedRule({
        weight: 15,
        message: `${scanResult.databaseInteractions.length} database interaction signals were detected across the codebase.`,
        issues: [buildIssue({
          category: "performance",
          severity: "medium",
          title: "High database interaction density",
          description: `${scanResult.databaseInteractions.length} database interaction signals were detected across the codebase.`,
          recommendation: "Review query efficiency, batching, indexing, and repeated database round trips.",
          ruleId: "performance.chatty-database"
        })]
      });
    }
  }),
  createRule({
    name: "large-service-surface",
    category: "performance",
    weight: 8,
    evaluate: (scanResult) => {
      if (scanResult.apis.length < 8) {
        return buildPassedRule("API surface size does not yet demand extra optimization signals.");
      }

      if (scanResult.cachingSignals.length > 0 || scanResult.monitoringSignals.length > 0) {
        return buildPassedRule("Larger API surface has optimization or monitoring signals.");
      }

      return buildFailedRule({
        weight: 8,
        message: `${scanResult.apis.length} APIs were found, but no caching or monitoring signals were detected.`,
        issues: [buildIssue({
          category: "performance",
          severity: "low",
          title: "Large API surface lacks optimization signals",
          description: `${scanResult.apis.length} APIs were found, but no caching or monitoring signals were detected.`,
          recommendation: "Add cache strategy and latency monitoring for critical endpoints.",
          ruleId: "performance.large-service-surface"
        })]
      });
    }
  })
];
