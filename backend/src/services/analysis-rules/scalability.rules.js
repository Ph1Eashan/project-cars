const {
  createRule,
  buildIssue,
  buildFailedRule,
  buildPassedRule
} = require("./helpers");

module.exports = [
  createRule({
    name: "synchronous-flows",
    category: "scalability",
    weight: 15,
    rootCauseKey: "sync-bottlenecks",
    evaluate: (scanResult) => {
      const blockingCount = scanResult.blockingPatterns.length;
      if (blockingCount < 2) {
        return buildPassedRule("No significant synchronous flow risk was detected.");
      }

      return buildFailedRule({
        weight: 15,
        impact: Math.min(22, 10 + blockingCount * 3),
        message: `${blockingCount} synchronous bottleneck(s) were detected across a ${scanResult.apis.length}-route API surface, which may limit concurrency under load.`,
        issues: [buildIssue({
          category: "scalability",
          severity: "medium",
          title: "Synchronous code paths may limit horizontal scaling",
          description: "Several synchronous operations were detected in code that appears close to application logic.",
          recommendation: "Move blocking work to async workflows, workers, or external processing layers.",
          ruleId: "scalability.synchronous-flows"
        })]
      });
    }
  }),
  createRule({
    name: "missing-queues",
    category: "scalability",
    weight: 8,
    evaluate: (scanResult) => {
      const serviceComplexity = scanResult.services.length + scanResult.apis.length;

      if (serviceComplexity < 6 || scanResult.asyncMessagingSignals.length > 0) {
        return buildPassedRule("Queue coverage is present or service complexity is still small.");
      }

      return buildFailedRule({
        weight: 8,
        message: "The codebase has a growing service surface, but no queue or event-processing tooling was identified.",
        issues: [buildIssue({
          category: "scalability",
          severity: "low",
          title: "Queue or event-driven processing not detected",
          description: "The codebase has a growing service surface, but no queue or event-processing tooling was identified.",
          recommendation: "Introduce background workers for long-running, retryable, or bursty jobs.",
          ruleId: "scalability.missing-queues"
        })]
      });
    }
  }),
  createRule({
    name: "monolith-coupling",
    category: "scalability",
    weight: 15,
    evaluate: (scanResult) => {
      const internalDependencies = scanResult.dependencies.filter((dependency) => dependency.to.startsWith("."));

      if (scanResult.services.length < 4 || internalDependencies.length < 12) {
        return buildPassedRule("Internal dependency density does not suggest severe coupling.");
      }

      return buildFailedRule({
        weight: 15,
        message: `${internalDependencies.length} internal imports were found across ${scanResult.services.length} services, suggesting tighter coupling than ideal.`,
        issues: [buildIssue({
          category: "scalability",
          severity: "medium",
          title: "Service dependency graph looks tightly coupled",
          description: `${internalDependencies.length} internal imports were found across a multi-service codebase.`,
          recommendation: "Review module boundaries and isolate independent workflows behind contracts or events.",
          ruleId: "scalability.monolith-coupling"
        })]
      });
    }
  }),
  createRule({
    name: "stateful-implementation",
    category: "scalability",
    weight: 8,
    evaluate: (scanResult) => {
      if (scanResult.statefulSignals.length === 0) {
        return buildPassedRule("No risky stateful runtime patterns were detected.");
      }

      return buildFailedRule({
        weight: 8,
        message: `In-memory session or singleton-like state signals were detected in ${scanResult.statefulSignals.length} file(s).`,
        issues: [buildIssue({
          category: "scalability",
          severity: "low",
          title: "Stateful runtime patterns may complicate scaling",
          description: `In-memory session or singleton-like state signals were detected in ${scanResult.statefulSignals.length} file(s).`,
          file: scanResult.statefulSignals[0],
          recommendation: "Externalize shared state to distributed stores when scaling across instances.",
          ruleId: "scalability.stateful-implementation"
        })]
      });
    }
  })
];
