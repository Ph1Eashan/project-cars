const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  detectProjectLanguage,
  createBaseScanContext,
  routeAnalyzers,
  scanRepository
} = require("../../src/services/repository-analysis.service");
const { analyzeJavaRepository, analyzeNodeRepository, getDetectedJavaRoutes, getDetectedNodeRoutes } = require("../../src/services/analyzers");

describe("repository language detection", () => {
  test("detects Node.js from package.json", () => {
    const language = detectProjectLanguage([
      { path: "package.json" },
      { path: "src/app.js" }
    ]);

    expect(language).toBe("Node.js");
  });

  test("detects Java from pom.xml", () => {
    const language = detectProjectLanguage([
      { path: "pom.xml" },
      { path: "src/main/java/App.java" }
    ]);

    expect(language).toBe("Java");
  });

  test("detects Java from build.gradle", () => {
    const language = detectProjectLanguage([
      { path: "build.gradle" },
      { path: "src/main/java/App.java" }
    ]);

    expect(language).toBe("Java");
  });

  test("detects polyglot repositories", () => {
    const language = detectProjectLanguage([
      { path: "package.json" },
      { path: "pom.xml" },
      { path: "src/app.js" },
      { path: "src/main/java/App.java" }
    ]);

    expect(language).toBe("Polyglot (Node.js, Java)");
  });
});

describe("analyzer routing", () => {
  function copyFixtureToTemp(fixtureName) {
    const fixtureRoot = path.resolve(__dirname, "..", "fixtures", fixtureName);
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `project-cars-${fixtureName}-`));
    const destination = path.join(tempRoot, fixtureName);
    fs.cpSync(fixtureRoot, destination, { recursive: true });
    return destination;
  }

  test("routes Java repositories to the Java analyzer and normalizes output", () => {
    const repoPath = copyFixtureToTemp("java-repo");
    const baseContext = createBaseScanContext(repoPath);
    const analyzerResults = routeAnalyzers(baseContext.detectedLanguage, baseContext.files);

    expect(baseContext.detectedLanguage).toBe("Java");
    expect(analyzerResults).toHaveLength(1);

    const result = analyzerResults[0];
    expect(result.apis.length).toBeGreaterThan(0);
    expect(result.apis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/cars", method: "GET" }),
        expect.objectContaining({ path: "/cars", method: "POST" })
      ])
    );
    expect(result.services.length).toBeGreaterThan(0);
    expect(result.repositories.length).toBeGreaterThan(0);
    expect(result.validationSignals.length).toBeGreaterThan(0);
    expect(result.authSignals.length).toBeGreaterThan(0);
  });

  test("runs both analyzers for polyglot repositories and merges their results", () => {
    const repoPath = copyFixtureToTemp("polyglot-repo");
    const result = scanRepository(repoPath);

    expect(result.detectedLanguage).toBe("Polyglot (Node.js, Java)");
    expect(result.apis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/cars", method: "POST" }),
        expect.objectContaining({ path: "/admin/status", method: "GET" })
      ])
    );
    expect(result.apis.length).toBe(3);
  });
});

describe("route detection accuracy", () => {
  function copyFixtureToTemp(fixtureName) {
    const fixtureRoot = path.resolve(__dirname, "..", "fixtures", fixtureName);
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `project-cars-${fixtureName}-`));
    const destination = path.join(tempRoot, fixtureName);
    fs.cpSync(fixtureRoot, destination, { recursive: true });
    return destination;
  }

  test("detects all expected Node routes", () => {
    const repoPath = copyFixtureToTemp("node-routes-repo");
    const baseContext = createBaseScanContext(repoPath);
    const result = analyzeNodeRepository(baseContext.files);
    const detectedRoutes = getDetectedNodeRoutes(result.apis);

    expect(result.apis).toHaveLength(5);
    expect(detectedRoutes).toEqual({
      routes: ["GET /health", "GET /cars", "POST /cars", "PATCH /cars/:id", "DELETE /cars/:id"],
      count: 5
    });
  });

  test("detects all expected Java routes", () => {
    const repoPath = copyFixtureToTemp("java-routes-repo");
    const baseContext = createBaseScanContext(repoPath);
    const result = analyzeJavaRepository(baseContext.files);
    const detectedRoutes = getDetectedJavaRoutes(result.apis);

    expect(result.apis).toHaveLength(5);
    expect(detectedRoutes).toEqual({
      routes: ["GET /cars/health", "GET /cars", "POST /cars", "PATCH /cars/{id}", "DELETE /cars/{id}"],
      count: 5
    });
  });

  test("matches the real project-cars backend route count and debug validation output", () => {
    const backendRoot = path.resolve(__dirname, "..", "..");
    const result = scanRepository(backendRoot);

    expect(result.debugValidation.routeCount).toBe(7);
    expect(result.debugValidation.detectedRoutes).toEqual(
      expect.arrayContaining([
        "GET /health",
        "POST /analyze-repo",
        "GET /rules",
        "GET /architecture/:id",
        "GET /analysis/:id",
        "GET /car-view/:id",
        "POST /simulate"
      ])
    );
    expect(result.debugValidation.dbCallCount).toBe(
      result.debugValidation.routes.reduce((total, route) => total + route.dbCallCount, 0)
    );
    expect(result.debugValidation.bottleneckCount).toBe(
      result.debugValidation.routes.reduce((total, route) => total + route.bottleneckCount, 0)
    );
    expect(result.debugValidation.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "POST /analyze-repo",
          dbCallCount: expect.any(Number),
          bottleneckCount: expect.any(Number)
        }),
        expect.objectContaining({
          path: "GET /analysis/:id",
          dbCallCount: expect.any(Number),
          bottleneckCount: expect.any(Number)
        })
      ])
    );
    expect(result.debugValidation.routes).toHaveLength(7);
  });

  test("captures granular per-route DB and bottleneck metrics", () => {
    const repoPath = copyFixtureToTemp("node-route-metrics-repo");
    const result = scanRepository(repoPath);

    const carsRoute = result.debugValidation.routes.find((route) => route.path === "GET /cars");
    const healthRoute = result.debugValidation.routes.find((route) => route.path === "GET /health");
    const slowRoute = result.debugValidation.routes.find((route) => route.path === "POST /slow-cars");

    expect(carsRoute).toEqual(
      expect.objectContaining({
        path: "GET /cars",
        dbCallCount: 2,
        bottleneckCount: 0
      })
    );
    expect(healthRoute).toEqual(
      expect.objectContaining({
        path: "GET /health",
        dbCallCount: 0,
        bottleneckCount: 0
      })
    );
    expect(slowRoute).toEqual(
      expect.objectContaining({
        path: "POST /slow-cars",
        dbCallCount: 0,
        bottleneckCount: 2
      })
    );
    expect(result.debugValidation.dbCallCount).toBe(2);
    expect(result.debugValidation.bottleneckCount).toBe(2);
  });
});
