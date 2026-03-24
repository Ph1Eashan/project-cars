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
const { createZipFromFixture } = require("../helpers/fixture.utils");

jest.setTimeout(30000);

describe("Project Cars API integration", () => {
  let app;
  let mongoServer;
  let zipPath;
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
    expect(Array.isArray(analysisResponse.body.issues)).toBe(true);

    expect(carViewResponse.statusCode).toBe(200);
    expect(carViewResponse.body.engine).toBeDefined();
    expect(carViewResponse.body.dashboard).toBeDefined();
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
