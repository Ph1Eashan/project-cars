const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const connectDatabase = require("../../src/config/database");
const { runMigration } = require("../../scripts/migrate");
const { createLegacyFixture } = require("../fixtures/legacy-documents.fixture");

jest.setTimeout(30000);

describe("legacy migration script", () => {
  let mongoServer;

  async function seedLegacyData() {
    const fixture = createLegacyFixture();

    await mongoose.connection.db.collection("projects").insertMany(fixture.projects);
    await mongoose.connection.db.collection("architectures").insertMany(fixture.architectures);
    await mongoose.connection.db.collection("analysisreports").insertMany(fixture.analysisReports);

    return fixture;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = "test";

    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.MONGODB_DB_NAME = "project-cars-migration-test";

    await connectDatabase();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test("dry-run mode reports migrations without writing changes", async () => {
    const fixture = await seedLegacyData();

    const originalArchitectureCount = await mongoose.connection.db.collection("architectures").countDocuments();
    const originalAnalysisCount = await mongoose.connection.db.collection("analysisreports").countDocuments();

    const summary = await runMigration({
      dryRun: true,
      runId: "dry-run-test"
    });

    const projectOne = await mongoose.connection.db.collection("projects").findOne({
      _id: fixture.ids.projectOneId
    });
    const architectureOne = await mongoose.connection.db.collection("architectures").findOne({
      _id: fixture.ids.architectureOneId
    });
    const backupCount = await mongoose.connection.db.collection("migration_backups").countDocuments();

    expect(summary.runId).toBe("dry-run-test");
    expect(summary.migrated.length).toBeGreaterThan(0);
    expect(summary.skipped.some((entry) => entry.reason.includes("Referenced project does not exist"))).toBe(true);
    expect(projectOne.sourceFingerprint).toBeUndefined();
    expect(projectOne.lastAnalyzedAt).toBeUndefined();
    expect(Array.isArray(architectureOne.services)).toBe(true);
    expect(typeof architectureOne.services[0]).toBe("string");
    expect(await mongoose.connection.db.collection("architectures").countDocuments()).toBe(originalArchitectureCount);
    expect(await mongoose.connection.db.collection("analysisreports").countDocuments()).toBe(originalAnalysisCount);
    expect(backupCount).toBe(0);
  });

  test("real migration normalizes documents, creates backups, and keeps one canonical child per project", async () => {
    const fixture = await seedLegacyData();

    const summary = await runMigration({
      dryRun: false,
      runId: "real-migration-test"
    });

    const [
      projectOne,
      projectThree,
      architectureOne,
      architectureThree,
      analysisOne,
      analysisThree,
      projectTwoArchitectures,
      projectTwoReports,
      orphanArchitecture,
      orphanAnalysis,
      backups
    ] = await Promise.all([
      mongoose.connection.db.collection("projects").findOne({ _id: fixture.ids.projectOneId }),
      mongoose.connection.db.collection("projects").findOne({ _id: fixture.ids.projectThreeId }),
      mongoose.connection.db.collection("architectures").findOne({ _id: fixture.ids.architectureOneId }),
      mongoose.connection.db.collection("architectures").findOne({ _id: fixture.ids.architectureThreeId }),
      mongoose.connection.db.collection("analysisreports").findOne({ _id: fixture.ids.analysisOneId }),
      mongoose.connection.db.collection("analysisreports").findOne({ _id: fixture.ids.analysisThreeId }),
      mongoose.connection.db.collection("architectures").find({ projectId: fixture.ids.projectTwoId }).toArray(),
      mongoose.connection.db.collection("analysisreports").find({ projectId: fixture.ids.projectTwoId }).toArray(),
      mongoose.connection.db.collection("architectures").findOne({ _id: fixture.ids.orphanArchitectureId }),
      mongoose.connection.db.collection("analysisreports").findOne({ _id: fixture.ids.orphanAnalysisId }),
      mongoose.connection.db.collection("migration_backups").find({ runId: "real-migration-test" }).toArray()
    ]);

    expect(summary.migrated.length).toBeGreaterThan(0);
    expect(projectOne.sourceFingerprint).toBe("github:https://github.com/example/legacy-orders");
    expect(projectOne.lastAnalyzedAt).toBeDefined();

    expect(architectureOne.services[0]).toEqual({
      name: "orders.service",
      file: "src/services/orders.service.js"
    });
    expect(architectureOne.summary.totalFiles).toBe(10);
    expect(architectureOne.summary.totalDirectories).toBe(3);

    expect(projectThree.architectureId.toString()).toBe(fixture.ids.architectureThreeId.toString());
    expect(projectThree.analysisReportId.toString()).toBe(fixture.ids.analysisThreeId.toString());
    expect(architectureThree.services).toHaveLength(1);
    expect(architectureThree.services[0].file).toBe("src/services/billing.service.js");
    expect(analysisThree.breakdown.reliability.rules).toHaveLength(1);
    expect(analysisThree.breakdown.reliability.rules[0].ruleId).toBe("reliability.partial");
    expect(analysisThree.issues).toHaveLength(1);

    expect(projectTwoArchitectures).toHaveLength(1);
    expect(projectTwoArchitectures[0]._id.toString()).toBe(fixture.ids.architectureTwoCanonicalId.toString());
    expect(projectTwoReports).toHaveLength(1);
    expect(projectTwoReports[0]._id.toString()).toBe(fixture.ids.analysisTwoCanonicalId.toString());

    expect(orphanArchitecture).not.toBeNull();
    expect(orphanAnalysis).not.toBeNull();
    expect(summary.skipped.some((entry) => entry.reason.includes("Referenced project does not exist"))).toBe(true);

    expect(backups.length).toBeGreaterThan(0);
    expect(backups.some((entry) => entry.operation === "delete-duplicate")).toBe(true);
  });
});
