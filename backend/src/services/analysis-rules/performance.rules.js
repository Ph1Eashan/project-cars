const {
  createRule,
  buildIssue,
  buildFailedRule,
  buildPassedRule,
  buildRuleResult,
  formatRatio
} = require("./helpers");

module.exports = [
  createRule({
    name: "blocking-operations",
    category: "performance",
    weight: 8,
    rootCauseKey: "sync-bottlenecks",
    evaluate: (scanResult) => {
      const blockingCount = scanResult.blockingPatterns.length;
      if (blockingCount === 0) {
        return buildPassedRule("No blocking synchronous patterns were detected.");
      }

      return buildRuleResult({
        passed: false,
        impact: Math.min(24, blockingCount * 6),
        message: `${blockingCount} synchronous bottleneck(s) were detected that may block the event loop on hot request paths.`,
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
      const readEndpoints = scanResult.apis.filter((api) => api.method === "GET").length;
      const isReadHeavy = readEndpoints >= 3;

      if (!isReadHeavy || scanResult.cachingSignals.length > 0) {
        return buildPassedRule("Caching coverage is present or the API surface is not read-heavy.");
      }

      return buildFailedRule({
        weight: 8,
        message: `No caching layer was detected for ${readEndpoints} out of ${scanResult.apis.length} routes (${formatRatio(readEndpoints, scanResult.apis.length)}) that appear read-oriented.`,
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
      const totalDbSignals = scanResult.databaseInteractions.length;
      if (totalDbSignals < 6) {
        return buildPassedRule("Database interaction density looks manageable.");
      }

      const apiCount = Math.max(1, scanResult.apis.length);
      const dbCallsPerApi = (totalDbSignals / apiCount).toFixed(1);
      return buildFailedRule({
        weight: 18,
        impact: Math.min(24, 8 + Math.round(totalDbSignals / 2)),
        message: `${totalDbSignals} database call signals were detected across ${scanResult.apis.length} routes, or about ${dbCallsPerApi} per route.`,
        issues: [buildIssue({
          category: "performance",
          severity: "medium",
          title: "High database interaction density",
          description: `${totalDbSignals} database interaction signals were detected across the codebase, which is roughly ${dbCallsPerApi} per API route.`,
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
        message: `${scanResult.apis.length} routes were found, but caching and monitoring coverage still looks sparse.`,
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
