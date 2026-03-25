const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  detectProjectLanguage,
  createBaseScanContext,
  routeAnalyzers,
  scanRepository
} = require("../../src/services/repository-analysis.service");

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
