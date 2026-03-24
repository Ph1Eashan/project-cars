const { generateReport } = require("../../src/services/analysis-engine.service");

describe("analysis engine rule system", () => {
  test("returns category breakdown with rule metadata", () => {
    const report = generateReport({
      files: [],
      services: [{ name: "orders", file: "services/orders.service.js" }],
      apis: [
        { method: "GET", path: "/health", file: "app.js" },
        { method: "POST", path: "/orders", file: "routes/orders.routes.js" }
      ],
      dependencies: [{ from: "routes/orders.routes.js", to: "./services/orders.service" }],
      databaseInteractions: [],
      middleware: [],
      authSignals: [],
      validationSignals: [],
      cachingSignals: [],
      asyncMessagingSignals: [],
      errorHandlingSignals: [],
      monitoringSignals: [],
      statefulSignals: [],
      externalCallSignals: [],
      resilienceSignals: [],
      asyncWrapperSignals: [],
      healthEndpointSignals: [],
      blockingPatterns: [],
      tryCatchCount: 0,
      fileTree: [],
      totalFiles: 2,
      totalDirectories: 1
    });

    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.breakdown.security.score).toBeLessThan(100);
    expect(report.breakdown.security.rules.length).toBeGreaterThan(0);
    expect(report.breakdown.security.totalRules).toBe(report.breakdown.security.rules.length);
    expect(report.breakdown.security.rules[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        category: "security",
        weight: expect.any(Number),
        passed: expect.any(Boolean),
        impact: expect.any(Number),
        message: expect.anything()
      })
    );
  });

  test("specific rules contribute score impact and issues", () => {
    const report = generateReport({
      files: [],
      services: [{ name: "billing", file: "services/billing.service.js" }],
      apis: [{ method: "POST", path: "/billing", file: "routes/billing.routes.js" }],
      dependencies: [],
      databaseInteractions: [],
      middleware: [],
      authSignals: [],
      validationSignals: [],
      cachingSignals: [],
      asyncMessagingSignals: [],
      errorHandlingSignals: [],
      monitoringSignals: [],
      statefulSignals: [],
      externalCallSignals: [],
      resilienceSignals: [],
      asyncWrapperSignals: [],
      healthEndpointSignals: [],
      blockingPatterns: [],
      tryCatchCount: 0,
      fileTree: [],
      totalFiles: 1,
      totalDirectories: 1
    });

    const triggeredSecurityRules = report.breakdown.security.rules.filter((rule) => !rule.passed);

    expect(triggeredSecurityRules.length).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.ruleId === "security.missing-auth")).toBe(true);
    expect(report.security).toBeLessThan(100);
  });
});
