const {
  applyBrokenComponentPenalty,
  applyRouteWeightedPenalty,
  buildWorstRoutes,
  generateReport
} = require("../../src/services/analysis-engine.service");

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
      rateLimitSignals: [],
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
      detectedLanguage: "Node.js",
      fileTree: [],
      totalFiles: 2,
      totalDirectories: 1
    });

    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(typeof report.summary).toBe("string");
    expect(report.metadata.detectedLanguage).toBe("Node.js");
    expect(report.analysisConfidence).toBe("high");
    expect(report.criticalIssues).toBeGreaterThanOrEqual(0);
    expect(report.summary).not.toContain("rule(s) failed");
    expect(Array.isArray(report.topIssues)).toBe(true);
    expect(Array.isArray(report.worstRoutes)).toBe(true);
    expect(typeof report.systemClassification).toBe("string");
    expect(Array.isArray(report.metadata.recommendations)).toBe(true);
    expect(report.metadata.debugValidation).toEqual(
      expect.objectContaining({
        routeCount: expect.any(Number),
        detectedRoutes: expect.any(Array),
        dbCallCount: expect.any(Number),
        bottleneckCount: expect.any(Number)
      })
    );
    expect(report.categoryScores).toEqual(
      expect.objectContaining({
        security: expect.any(Number),
        performance: expect.any(Number),
        scalability: expect.any(Number),
        reliability: expect.any(Number)
      })
    );
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
        severity: expect.stringMatching(/low|medium|high/),
        message: expect.anything(),
        scoreImpact: expect.any(Number)
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
      rateLimitSignals: [],
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
      detectedLanguage: "Node.js",
      debugValidation: {
        routeCount: 3,
        detectedRoutes: ["GET /orders", "POST /orders", "PATCH /orders/:id"],
        dbCallCount: 0,
        bottleneckCount: 0
      },
      fileTree: [],
      totalFiles: 1,
      totalDirectories: 1
    });

    const triggeredSecurityRules = report.breakdown.security.rules.filter((rule) => !rule.passed);

    expect(triggeredSecurityRules.length).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.ruleId === "security.missing-auth")).toBe(true);
    expect(report.security).toBeLessThan(100);
    expect(report.analysisConfidence).toBe("medium");
    expect(report.summary).toContain("minimal backend surface");
    expect(report.criticalIssues).toBeGreaterThan(0);
    expect(report.topIssues[0]).toEqual(
      expect.objectContaining({
        rule: expect.any(String),
        impact: expect.any(Number),
        severity: expect.stringMatching(/low|medium|high/),
        message: expect.any(String),
        recommendation: expect.any(String)
      })
    );
  });

  test("applies stronger score penalties to high-severity issues and deduplicates summary text", () => {
    const report = generateReport({
      files: [],
      services: [{ name: "orders", file: "services/orders.service.js" }],
      apis: [
        { method: "GET", path: "/orders", file: "routes/orders.routes.js" },
        { method: "POST", path: "/orders", file: "routes/orders.routes.js" },
        { method: "PATCH", path: "/orders/:id", file: "routes/orders.routes.js" }
      ],
      dependencies: [],
      databaseInteractions: [],
      middleware: [],
      authSignals: [],
      validationSignals: [],
      cachingSignals: [],
      rateLimitSignals: [],
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
      detectedLanguage: "Node.js",
      fileTree: [],
      totalFiles: 1,
      totalDirectories: 1
    });

    const missingAuthRule = report.breakdown.security.rules.find((rule) => rule.ruleId === "security.missing-auth");

    expect(missingAuthRule.severity).toBe("high");
    expect(missingAuthRule.scoreImpact).toBe(Math.round(missingAuthRule.impact * 1.5));
    expect(report.topIssues.every((issue, index, issues) => index === 0 || issues[index - 1].impact >= issue.impact)).toBe(true);
    expect(new Set(report.metadata.recommendations).size).toBe(report.metadata.recommendations.length);
    expect(report.summary.match(/Authentication signals are missing/gi)?.length || 0).toBe(1);
  });

  test("applies an extra score penalty when engine or transmission is broken", () => {
    const adjustedScore = applyBrokenComponentPenalty(82, [
      {
        ruleId: "performance.chatty-database",
        name: "chatty-database",
        passed: false,
        impact: 22
      },
      {
        ruleId: "scalability.monolith-coupling",
        name: "monolith-coupling",
        passed: false,
        impact: 21
      }
    ]);

    expect(adjustedScore).toBeLessThan(65);
  });

  test("returns worst routes in descending route-load order", () => {
    const worstRoutes = buildWorstRoutes({
      routes: [
        { path: "GET /health", dbCallCount: 0, bottleneckCount: 0 },
        { path: "POST /imports", dbCallCount: 3, bottleneckCount: 2 },
        { path: "GET /cars", dbCallCount: 2, bottleneckCount: 0 },
        { path: "POST /slow-cars", dbCallCount: 0, bottleneckCount: 3 }
      ]
    });

    expect(worstRoutes).toEqual([
      { path: "POST /imports", dbCallCount: 3, bottleneckCount: 2 },
      { path: "POST /slow-cars", dbCallCount: 0, bottleneckCount: 3 },
      { path: "GET /cars", dbCallCount: 2, bottleneckCount: 0 }
    ]);
  });

  test("applies additional score penalty when heavy routes exist", () => {
    const adjustedScore = applyRouteWeightedPenalty(88, {
      routes: [
        { path: "GET /health", dbCallCount: 0, bottleneckCount: 0 },
        { path: "POST /imports", dbCallCount: 4, bottleneckCount: 2 },
        { path: "POST /slow-cars", dbCallCount: 1, bottleneckCount: 3 }
      ]
    });

    expect(adjustedScore).toBeLessThan(88);
  });

  test("caps score and lowers confidence when no backend is detected", () => {
    const report = generateReport({
      files: [],
      services: [],
      apis: [],
      dependencies: [],
      databaseInteractions: [],
      middleware: [],
      authSignals: [],
      validationSignals: [],
      cachingSignals: [],
      rateLimitSignals: [],
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
      detectedLanguage: "Unknown",
      fileTree: [],
      totalFiles: 0,
      totalDirectories: 0
    });

    expect(report.analysisConfidence).toBe("low");
    expect(report.score).toBeLessThan(40);
    expect(report.systemClassification).toBe("No backend detected");
    expect(report.summary).toContain("No backend signals were detected");
  });
});
