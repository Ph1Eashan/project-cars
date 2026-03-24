const { createRule, buildIssue } = require("./helpers");

module.exports = [
  createRule({
    id: "performance.blocking-operations",
    title: "Blocking operations detected",
    description: "Synchronous operations can delay the event loop.",
    severity: "medium",
    evaluate: (scanResult) => {
      if (scanResult.blockingPatterns.length === 0) {
        return null;
      }

      return {
        scoreImpact: Math.min(30, scanResult.blockingPatterns.length * 8),
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
      };
    }
  }),
  createRule({
    id: "performance.missing-caching",
    title: "Caching layer is not detected",
    description: "Read-heavy APIs often benefit from caching.",
    severity: "low",
    evaluate: (scanResult) => {
      const isReadHeavy = scanResult.apis.filter((api) => api.method === "GET").length >= 3;

      if (!isReadHeavy || scanResult.cachingSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "performance",
          severity: "low",
          title: "Caching layer not detected",
          description: "Several GET endpoints were found, but no cache-related libraries or cache headers were identified.",
          recommendation: "Consider endpoint or query caching for expensive read paths.",
          ruleId: "performance.missing-caching"
        })
      };
    }
  }),
  createRule({
    id: "performance.chatty-database",
    title: "High database touchpoints detected",
    description: "Many database interactions can create latency under load.",
    severity: "medium",
    evaluate: (scanResult) => {
      if (scanResult.databaseInteractions.length < 6) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "performance",
          severity: "medium",
          title: "High database interaction density",
          description: `${scanResult.databaseInteractions.length} database interaction signals were detected across the codebase.`,
          recommendation: "Review query efficiency, batching, indexing, and repeated database round trips.",
          ruleId: "performance.chatty-database"
        })
      };
    }
  }),
  createRule({
    id: "performance.large-service-surface",
    title: "Large API surface without optimization signals",
    description: "Bigger service surfaces benefit from instrumentation and caching.",
    severity: "low",
    evaluate: (scanResult) => {
      if (scanResult.apis.length < 8) {
        return null;
      }

      if (scanResult.cachingSignals.length > 0 || scanResult.monitoringSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "performance",
          severity: "low",
          title: "Large API surface lacks optimization signals",
          description: `${scanResult.apis.length} APIs were found, but no caching or monitoring signals were detected.`,
          recommendation: "Add cache strategy and latency monitoring for critical endpoints.",
          ruleId: "performance.large-service-surface"
        })
      };
    }
  })
];
