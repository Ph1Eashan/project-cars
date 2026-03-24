const { createRule, buildIssue } = require("./helpers");

module.exports = [
  createRule({
    id: "scalability.synchronous-flows",
    title: "Synchronous flows may limit scaling",
    description: "Blocking patterns do not scale well with concurrent traffic.",
    severity: "medium",
    evaluate: (scanResult) => {
      if (scanResult.blockingPatterns.length < 2) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "scalability",
          severity: "medium",
          title: "Synchronous code paths may limit horizontal scaling",
          description: "Several synchronous operations were detected in code that appears close to application logic.",
          recommendation: "Move blocking work to async workflows, workers, or external processing layers.",
          ruleId: "scalability.synchronous-flows"
        })
      };
    }
  }),
  createRule({
    id: "scalability.missing-queues",
    title: "Queue or event processing not detected",
    description: "Distributed workloads often benefit from background processing.",
    severity: "low",
    evaluate: (scanResult) => {
      const serviceComplexity = scanResult.services.length + scanResult.apis.length;

      if (serviceComplexity < 6 || scanResult.asyncMessagingSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "scalability",
          severity: "low",
          title: "Queue or event-driven processing not detected",
          description: "The codebase has a growing service surface, but no queue or event-processing tooling was identified.",
          recommendation: "Introduce background workers for long-running, retryable, or bursty jobs.",
          ruleId: "scalability.missing-queues"
        })
      };
    }
  }),
  createRule({
    id: "scalability.monolith-coupling",
    title: "Dependency graph suggests tight coupling",
    description: "Dense internal dependencies can make scaling and separation harder.",
    severity: "medium",
    evaluate: (scanResult) => {
      const internalDependencies = scanResult.dependencies.filter((dependency) => dependency.to.startsWith("."));

      if (scanResult.services.length < 4 || internalDependencies.length < 12) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "scalability",
          severity: "medium",
          title: "Service dependency graph looks tightly coupled",
          description: `${internalDependencies.length} internal imports were found across a multi-service codebase.`,
          recommendation: "Review module boundaries and isolate independent workflows behind contracts or events.",
          ruleId: "scalability.monolith-coupling"
        })
      };
    }
  }),
  createRule({
    id: "scalability.stateful-implementation",
    title: "Stateful runtime signals detected",
    description: "In-memory state can complicate horizontal scaling.",
    severity: "low",
    evaluate: (scanResult) => {
      if (scanResult.statefulSignals.length === 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "scalability",
          severity: "low",
          title: "Stateful runtime patterns may complicate scaling",
          description: `In-memory session or singleton-like state signals were detected in ${scanResult.statefulSignals.length} file(s).`,
          file: scanResult.statefulSignals[0],
          recommendation: "Externalize shared state to distributed stores when scaling across instances.",
          ruleId: "scalability.stateful-implementation"
        })
      };
    }
  })
];
