const fs = require("fs");
const path = require("path");

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const AdmZip = require("adm-zip");

jest.mock("axios", () => ({
  get: jest.fn()
}));

const axios = require("axios");
const connectDatabase = require("../../src/config/database");
const Project = require("../../src/models/project.model");
const Architecture = require("../../src/models/architecture.model");
const AnalysisReport = require("../../src/models/analysis-report.model");
const { createEmptyRepositoryZip, createZipFromFixture } = require("../helpers/fixture.utils");

jest.setTimeout(30000);

describe("Project Cars API integration", () => {
  let app;
  let mongoServer;
  let zipPath;
  let confidenceZipPaths = [];
  let uploadedProjectId;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.CLIENT_ORIGIN = "http://localhost:3000";
    process.env.RATE_LIMIT_MAX_REQUESTS = "1000";
    process.env.RATE_LIMIT_WINDOW_MS = "900000";
    process.env.BODY_LIMIT = "10mb";

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.MONGODB_DB_NAME = "project-cars-test";

    app = require("../../src/app");
    await connectDatabase();

    const fixtureRoot = path.join(__dirname, "..", "fixtures", "sample-repo");
    zipPath = createZipFromFixture(fixtureRoot);
  });

  afterAll(async () => {
    if (zipPath && fs.existsSync(zipPath)) {
      fs.rmSync(zipPath, { force: true });
    }

    confidenceZipPaths.forEach((fixtureZipPath) => {
      if (fixtureZipPath && fs.existsSync(fixtureZipPath)) {
        fs.rmSync(fixtureZipPath, { force: true });
      }
    });

    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  afterEach(async () => {
    axios.get.mockReset();
  });

  test("GET /health returns service health", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("project-cars-backend");
  });

  test("GET /rules returns active rules grouped by category", async () => {
    const response = await request(app).get("/rules");

    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.body)).toEqual(
      expect.arrayContaining(["security", "performance", "scalability", "reliability"])
    );
    expect(response.body.security[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        category: "security",
        weight: expect.any(Number)
      })
    );
    expect(response.body.security[0].evaluate).toBeUndefined();
  });

  test("POST /simulate returns a stress prediction without project context", async () => {
    const response = await request(app)
      .post("/simulate")
      .send({ users: 250 });

    expect(response.statusCode).toBe(200);
    expect(response.body.users).toBe(250);
    expect(response.body.predictedSystemStress).toBeGreaterThan(0);
    expect(response.body.stressLevel).toBeDefined();
    expect(Array.isArray(response.body.warnings)).toBe(true);
  });

  test("POST /analyze-repo accepts zip upload and persists project artifacts", async () => {
    const response = await request(app)
      .post("/analyze-repo")
      .attach("zipFile", zipPath);

    expect(response.statusCode).toBe(201);
    expect(response.body.projectId).toBeDefined();
    expect(response.body.architectureId).toBeDefined();
    expect(response.body.analysisReportId).toBeDefined();

    uploadedProjectId = response.body.projectId;

    const [project, architecture, report] = await Promise.all([
      Project.findById(uploadedProjectId),
      Architecture.findById(response.body.architectureId),
      AnalysisReport.findById(response.body.analysisReportId)
    ]);

    expect(project).not.toBeNull();
    expect(architecture).not.toBeNull();
    expect(report).not.toBeNull();
  });

  test("POST /simulate accepts a valid projectId", async () => {
    if (!uploadedProjectId) {
      const analyzeResponse = await request(app)
        .post("/analyze-repo")
        .attach("zipFile", zipPath);
      uploadedProjectId = analyzeResponse.body.projectId;
    }

    const response = await request(app)
      .post("/simulate")
      .send({
        users: 500,
        projectId: uploadedProjectId
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.stressLevel).toMatch(/low|moderate|high/);
  });

  test("GET project read endpoints return stored records", async () => {
    if (!uploadedProjectId) {
      const analyzeResponse = await request(app)
        .post("/analyze-repo")
        .attach("zipFile", zipPath);
      uploadedProjectId = analyzeResponse.body.projectId;
    }

    const [architectureResponse, analysisResponse, carViewResponse] = await Promise.all([
      request(app).get(`/architecture/${uploadedProjectId}`),
      request(app).get(`/analysis/${uploadedProjectId}`),
      request(app).get(`/car-view/${uploadedProjectId}`)
    ]);

    expect(architectureResponse.statusCode).toBe(200);
    expect(architectureResponse.body.services.length).toBeGreaterThan(0);

    expect(analysisResponse.statusCode).toBe(200);
    expect(analysisResponse.body.score).toBeGreaterThanOrEqual(0);
    expect(typeof analysisResponse.body.systemClassification).toBe("string");
    expect(analysisResponse.body.metadata).toEqual(
      expect.objectContaining({
        detectedLanguage: "Node.js"
      })
    );
    expect(analysisResponse.body.categoryScores).toEqual(
      expect.objectContaining({
        security: expect.any(Number),
        performance: expect.any(Number),
        scalability: expect.any(Number),
        reliability: expect.any(Number)
      })
    );
    expect(typeof analysisResponse.body.summary).toBe("string");
    expect(Array.isArray(analysisResponse.body.topIssues)).toBe(true);
    expect(Array.isArray(analysisResponse.body.worstRoutes)).toBe(true);
    if (analysisResponse.body.topIssues.length > 0) {
      expect(analysisResponse.body.topIssues[0]).toEqual(
        expect.objectContaining({
          rule: expect.any(String),
          impact: expect.any(Number),
          severity: expect.stringMatching(/low|medium|high/),
          message: expect.any(String),
          recommendation: expect.any(String)
        })
      );
    }
    if (analysisResponse.body.worstRoutes.length > 0) {
      expect(analysisResponse.body.worstRoutes[0]).toEqual(
        expect.objectContaining({
          path: expect.any(String),
          dbCallCount: expect.any(Number),
          bottleneckCount: expect.any(Number)
        })
      );
    }
    expect(Array.isArray(analysisResponse.body.issues)).toBe(true);
    expect(Array.isArray(analysisResponse.body.results)).toBe(true);

    expect(carViewResponse.statusCode).toBe(200);
    expect(carViewResponse.body.car).toBeDefined();
    expect(carViewResponse.body.car.engine.status).toMatch(/healthy|weak|broken|missing/);
    expect(Array.isArray(carViewResponse.body.car.engine.reasons)).toBe(true);
    if (carViewResponse.body.car.engine.reasons.length > 0) {
      expect(carViewResponse.body.car.engine.reasons[0]).toEqual(
        expect.objectContaining({
          rule: expect.any(String),
          message: expect.any(String),
          recommendation: expect.anything()
        })
      );
    }
    expect(carViewResponse.body.car.security.status).toMatch(/healthy|weak|broken|missing/);
    expect(Array.isArray(carViewResponse.body.car.security.reasons)).toBe(true);
  });

  test("POST /analyze-repo accepts a GitHub URL when archive download succeeds", async () => {
    const archive = new AdmZip(zipPath);
    axios.get.mockResolvedValue({
      data: archive.toBuffer()
    });

    const response = await request(app)
      .post("/analyze-repo")
      .send({
        repoUrl: "https://github.com/example/sample-repo"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.projectId).toBeDefined();
    expect(axios.get).toHaveBeenCalled();
  });

  test("POST /analyze-repo assigns confidence classifications for edge-case repository shapes", async () => {
    const scenarios = [
      {
        fixtureName: "empty-repo",
        zipFactory: () => createEmptyRepositoryZip(),
        expected: {
          analysisConfidence: "low",
          maxScore: 35,
          systemClassification: "No backend detected",
          summaryPattern: /No backend signals were detected/i
        }
      },
      {
        fixtureName: "frontend-only-repo",
        expected: {
          analysisConfidence: "low",
          maxScore: 35,
          systemClassification: "No backend detected",
          summaryPattern: /No backend signals were detected/i
        }
      },
      {
        fixtureName: "no-backend-repo",
        expected: {
          analysisConfidence: "low",
          maxScore: 35,
          systemClassification: "No backend detected",
          summaryPattern: /No backend signals were detected/i
        }
      },
      {
        fixtureName: "irrelevant-files-repo",
        expected: {
          analysisConfidence: "low",
          maxScore: 35,
          systemClassification: "No backend detected",
          summaryPattern: /No backend signals were detected/i
        }
      },
      {
        fixtureName: "minimal-backend-repo",
        expected: {
          analysisConfidence: "medium",
          maxScore: 70,
          systemClassification: "Minimal backend surface",
          summaryPattern: /minimal backend surface/i
        }
      }
    ];

    for (const scenario of scenarios) {
      const fixtureRoot = path.join(__dirname, "..", "fixtures", scenario.fixtureName);
      const scenarioZipPath = scenario.zipFactory ? scenario.zipFactory() : createZipFromFixture(fixtureRoot);
      confidenceZipPaths.push(scenarioZipPath);

      const analyzeResponse = await request(app)
        .post("/analyze-repo")
        .attach("zipFile", scenarioZipPath);

      expect(analyzeResponse.statusCode).toBe(201);
      expect(analyzeResponse.body.projectId).toBeDefined();

      const analysisResponse = await request(app).get(`/analysis/${analyzeResponse.body.projectId}`);

      expect(analysisResponse.statusCode).toBe(200);
      expect(analysisResponse.body.analysisConfidence).toBe(scenario.expected.analysisConfidence);
      expect(analysisResponse.body.score).toBeLessThanOrEqual(scenario.expected.maxScore);
      expect(analysisResponse.body.systemClassification).toBe(scenario.expected.systemClassification);
      expect(analysisResponse.body.summary).toMatch(scenario.expected.summaryPattern);
    }
  });

  test("POST /simulate rejects invalid input with 400", async () => {
    const response = await request(app)
      .post("/simulate")
      .send({ users: 0 });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  test("GET /architecture/:id rejects invalid project ids with 400", async () => {
    const response = await request(app).get("/architecture/invalid-project-id");

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });
});
