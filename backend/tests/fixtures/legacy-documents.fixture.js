const mongoose = require("mongoose");

function objectId(hex) {
  return new mongoose.Types.ObjectId(hex);
}

function createLegacyFixture() {
  const projectOneId = objectId("64b000000000000000000001");
  const projectTwoId = objectId("64b000000000000000000002");
  const projectThreeId = objectId("64b000000000000000000003");
  const orphanProjectId = objectId("64b000000000000000000099");

  const architectureOneId = objectId("64b000000000000000000101");
  const architectureTwoCanonicalId = objectId("64b000000000000000000102");
  const architectureTwoDuplicateId = objectId("64b000000000000000000103");
  const architectureThreeId = objectId("64b000000000000000000104");
  const orphanArchitectureId = objectId("64b000000000000000000105");

  const analysisOneId = objectId("64b000000000000000000201");
  const analysisTwoCanonicalId = objectId("64b000000000000000000202");
  const analysisTwoDuplicateId = objectId("64b000000000000000000203");
  const analysisThreeId = objectId("64b000000000000000000204");
  const orphanAnalysisId = objectId("64b000000000000000000205");

  return {
    ids: {
      projectOneId,
      projectTwoId,
      projectThreeId,
      architectureOneId,
      architectureTwoCanonicalId,
      architectureTwoDuplicateId,
      architectureThreeId,
      analysisOneId,
      analysisTwoCanonicalId,
      analysisTwoDuplicateId,
      analysisThreeId,
      orphanArchitectureId,
      orphanAnalysisId
    },
    projects: [
      {
        _id: projectOneId,
        name: "legacy-orders",
        sourceType: "github",
        sourceLocation: "https://github.com/example/legacy-orders",
        architectureId: architectureOneId,
        analysisReportId: analysisOneId,
        metadata: {
          totalFiles: 10,
          totalDirectories: 3
        },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z")
      },
      {
        _id: projectTwoId,
        name: "legacy-duplicate-service",
        sourceType: "zip",
        sourceLocation: "/tmp/legacy-duplicate-service.zip",
        architectureId: architectureTwoCanonicalId,
        analysisReportId: analysisTwoCanonicalId,
        metadata: {
          totalFiles: 7,
          totalDirectories: 2
        },
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-04T00:00:00.000Z")
      },
      {
        _id: projectThreeId,
        name: "legacy-corrupt-service",
        sourceType: "github",
        sourceLocation: "https://github.com/example/legacy-corrupt",
        metadata: {
          totalFiles: 4,
          totalDirectories: 1
        },
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        updatedAt: new Date("2026-01-06T00:00:00.000Z")
      }
    ],
    architectures: [
      {
        _id: architectureOneId,
        projectId: projectOneId,
        services: ["src/services/orders.service.js"],
        apis: [
          {
            method: "get",
            path: "/orders",
            file: "src/routes/orders.routes.js"
          }
        ],
        dependencies: [
          {
            from: "src/routes/orders.routes.js",
            to: "../services/orders.service"
          }
        ],
        databaseInteractions: ["src/models/order.model.js"],
        fileTree: ["src/app.js", "src/routes/orders.routes.js"],
        summary: {
          totalFiles: "10",
          totalDirectories: "3"
        },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z")
      },
      {
        _id: architectureTwoCanonicalId,
        projectId: projectTwoId,
        services: ["src/services/catalog.service.js"],
        apis: [
          {
            method: "post",
            path: "/catalog",
            file: "src/routes/catalog.routes.js"
          }
        ],
        dependencies: [
          {
            from: "src/routes/catalog.routes.js",
            to: "../services/catalog.service"
          }
        ],
        databaseInteractions: ["src/models/catalog.model.js"],
        fileTree: ["src/routes/catalog.routes.js"],
        summary: "legacy-summary",
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-03T00:00:00.000Z")
      },
      {
        _id: architectureTwoDuplicateId,
        projectId: projectTwoId,
        services: [
          {
            name: "catalog-service",
            file: "src/services/catalog.service.js"
          }
        ],
        apis: [
          {
            method: "POST",
            path: "/catalog",
            file: "src/routes/catalog.routes.js"
          }
        ],
        dependencies: [
          {
            from: "src/routes/catalog.routes.js",
            to: "../services/catalog.service"
          }
        ],
        databaseInteractions: [
          {
            file: "src/models/catalog.model.js",
            type: "query-operation"
          }
        ],
        fileTree: [
          {
            name: "src",
            type: "directory",
            children: [
              {
                name: "routes",
                type: "directory",
                children: [
                  {
                    name: "catalog.routes.js",
                    type: "file"
                  }
                ]
              }
            ]
          }
        ],
        summary: {
          totalFiles: 8,
          totalDirectories: 2,
          middlewareCount: 1
        },
        createdAt: new Date("2026-01-04T00:00:00.000Z"),
        updatedAt: new Date("2026-01-05T00:00:00.000Z")
      },
      {
        _id: architectureThreeId,
        projectId: projectThreeId,
        services: [null, { wrong: "shape" }, "src/services/billing.service.js"],
        apis: [{ path: "/billing" }, "bad-entry"],
        dependencies: [null, { to: "../services/billing.service" }],
        databaseInteractions: [null, "src/models/billing.model.js"],
        fileTree: [null, { name: "src", type: "directory", children: ["billing.js"] }],
        summary: null,
        createdAt: new Date("2026-01-06T00:00:00.000Z"),
        updatedAt: new Date("2026-01-07T00:00:00.000Z")
      },
      {
        _id: orphanArchitectureId,
        projectId: orphanProjectId,
        services: ["src/services/orphan.service.js"],
        apis: [],
        dependencies: [],
        databaseInteractions: [],
        fileTree: [],
        summary: {},
        createdAt: new Date("2026-01-07T00:00:00.000Z"),
        updatedAt: new Date("2026-01-08T00:00:00.000Z")
      }
    ],
    analysisReports: [
      {
        _id: analysisOneId,
        projectId: projectOneId,
        score: "76",
        security: "80",
        performance: "70",
        scalability: "75",
        reliability: "79",
        issues: [
          {
            category: "security",
            severity: "medium",
            title: "Legacy security issue",
            description: "Needs normalization"
          }
        ],
        breakdown: {
          security: [
            {
              id: "security.legacy-auth",
              title: "Legacy auth rule",
              triggered: true,
              scoreImpact: "10",
              issues: [
                {
                  category: "security",
                  severity: "medium",
                  title: "Auth issue",
                  description: "Missing auth"
                }
              ]
            }
          ]
        },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z")
      },
      {
        _id: analysisTwoCanonicalId,
        projectId: projectTwoId,
        score: 64,
        security: 65,
        performance: 62,
        scalability: 61,
        reliability: 68,
        issues: [
          {
            category: "performance",
            severity: "medium",
            title: "Legacy performance issue",
            description: "Needs normalization"
          }
        ],
        breakdown: {
          performance: [
            {
              id: "performance.legacy-cache",
              title: "Legacy cache rule",
              triggered: true,
              scoreImpact: 12
            }
          ]
        },
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-04T00:00:00.000Z")
      },
      {
        _id: analysisTwoDuplicateId,
        projectId: projectTwoId,
        score: 90,
        security: 90,
        performance: 90,
        scalability: 90,
        reliability: 90,
        issues: [],
        breakdown: {
          security: {
            score: 90,
            rules: []
          },
          performance: {
            score: 90,
            rules: []
          },
          scalability: {
            score: 90,
            rules: []
          },
          reliability: {
            score: 90,
            rules: []
          }
        },
        createdAt: new Date("2026-01-05T00:00:00.000Z"),
        updatedAt: new Date("2026-01-06T00:00:00.000Z")
      },
      {
        _id: analysisThreeId,
        projectId: projectThreeId,
        score: "40",
        security: null,
        performance: "35",
        scalability: "bad",
        reliability: 50,
        issues: [null, { title: "Corrupt issue" }],
        breakdown: {
          reliability: {
            triggeredRules: "1",
            rules: [
              {
                id: "reliability.partial",
                title: "Partial rule"
              }
            ]
          }
        },
        createdAt: new Date("2026-01-06T00:00:00.000Z"),
        updatedAt: new Date("2026-01-07T00:00:00.000Z")
      },
      {
        _id: orphanAnalysisId,
        projectId: orphanProjectId,
        score: 20,
        security: 20,
        performance: 20,
        scalability: 20,
        reliability: 20,
        issues: [],
        breakdown: {},
        createdAt: new Date("2026-01-07T00:00:00.000Z"),
        updatedAt: new Date("2026-01-08T00:00:00.000Z")
      }
    ]
  };
}

module.exports = {
  createLegacyFixture
};
