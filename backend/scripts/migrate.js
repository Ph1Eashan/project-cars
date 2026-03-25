#!/usr/bin/env node

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

mongoose.set("autoIndex", false);

const connectDatabase = require("../src/config/database");

function createRunId() {
  return `migration-${new Date().toISOString()}-${crypto.randomBytes(4).toString("hex")}`;
}

function asObjectId(value) {
  if (!value) {
    return null;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (mongoose.Types.ObjectId.isValid(String(value))) {
    return new mongoose.Types.ObjectId(String(value));
  }

  return null;
}

function normalizeString(value, fallback = null) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function normalizeNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return fallback;
}

function normalizeNodeWithFile(entry, fallbackName = "unknown") {
  if (typeof entry === "string") {
    return {
      name: path.basename(entry, path.extname(entry)) || fallbackName,
      file: entry
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const file = normalizeString(entry.file || entry.path || entry.location);
  const name =
    normalizeString(entry.name) ||
    (file ? path.basename(file, path.extname(file)) : null) ||
    fallbackName;

  if (!file) {
    return null;
  }

  return { name, file };
}

function normalizeApi(entry) {
  if (typeof entry === "string") {
    return null;
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const method = normalizeString(entry.method, "GET");
  const routePath = normalizeString(entry.path || entry.route || entry.url);
  const file = normalizeString(entry.file || entry.source || entry.location);

  if (!routePath || !file) {
    return null;
  }

  return {
    method: method.toUpperCase(),
    path: routePath,
    file
  };
}

function normalizeDependency(entry) {
  if (typeof entry === "string") {
    return null;
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const from = normalizeString(entry.from || entry.file || entry.source);
  const to = normalizeString(entry.to || entry.target || entry.dependency);

  if (!from || !to) {
    return null;
  }

  return { from, to };
}

function normalizeDatabaseInteraction(entry) {
  if (typeof entry === "string") {
    return {
      file: entry,
      type: "database-library"
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const file = normalizeString(entry.file || entry.path || entry.location);
  const type = normalizeString(entry.type, "unknown");

  if (!file) {
    return null;
  }

  return { file, type };
}

function normalizeFileTreeNode(entry) {
  if (typeof entry === "string") {
    return {
      name: entry,
      type: "file"
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const nodeType = normalizeString(entry.type, "file");
  const name = normalizeString(entry.name || entry.label || entry.path, "unknown");
  const children = Array.isArray(entry.children)
    ? entry.children.map(normalizeFileTreeNode).filter(Boolean)
    : undefined;

  return {
    name,
    type: nodeType === "directory" ? "directory" : "file",
    ...(children && children.length > 0 ? { children } : {})
  };
}

function normalizeIssue(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    category: normalizeString(entry.category, "unknown"),
    severity: normalizeString(entry.severity, "medium"),
    title: normalizeString(entry.title, "Untitled issue"),
    description: normalizeString(entry.description, "No description provided"),
    file: normalizeString(entry.file),
    recommendation: normalizeString(entry.recommendation, "Review this issue."),
    ruleId: normalizeString(entry.ruleId)
  };
}

function normalizeRuleBreakdown(entry, category) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return {
    ruleId: normalizeString(entry.ruleId || entry.id, `${category}.legacy-rule`),
    category: normalizeString(entry.category, category),
    title: normalizeString(entry.title, "Legacy rule"),
    description: normalizeString(entry.description, "Migrated from legacy report data."),
    severity: normalizeString(entry.severity, "medium"),
    triggered: Boolean(entry.triggered),
    scoreImpact: normalizeNumber(entry.scoreImpact, 0),
    issues: Array.isArray(entry.issues) ? entry.issues.map(normalizeIssue).filter(Boolean) : []
  };
}

function normalizeCategoryBreakdown(entry, category) {
  const rulesSource = Array.isArray(entry)
    ? entry
    : Array.isArray(entry?.rules)
      ? entry.rules
      : [];

  const rules = rulesSource.map((rule) => normalizeRuleBreakdown(rule, category)).filter(Boolean);

  return {
    score: normalizeNumber(entry?.score, 100),
    weight: normalizeNumber(entry?.weight, 1),
    totalImpact: normalizeNumber(entry?.totalImpact, rules.reduce((sum, rule) => sum + rule.scoreImpact, 0)),
    triggeredRules: normalizeNumber(
      entry?.triggeredRules,
      rules.filter((rule) => rule.triggered).length
    ),
    totalRules: normalizeNumber(entry?.totalRules, rules.length),
    rules
  };
}

function isArchitectureLegacy(doc) {
  if (!doc) {
    return false;
  }

  const hasUntypedServices = Array.isArray(doc.services) && doc.services.some((entry) => !entry || typeof entry !== "object" || !entry.name || !entry.file);
  const hasUntypedApis = Array.isArray(doc.apis) && doc.apis.some((entry) => !entry || typeof entry !== "object" || !entry.method || !entry.path || !entry.file);
  const hasUntypedDependencies = Array.isArray(doc.dependencies) && doc.dependencies.some((entry) => !entry || typeof entry !== "object" || !entry.from || !entry.to);
  const hasMixedSummary =
    !doc.summary ||
    typeof doc.summary !== "object" ||
    Array.isArray(doc.summary) ||
    typeof doc.summary.totalFiles !== "number" ||
    typeof doc.summary.totalDirectories !== "number";

  return hasUntypedServices || hasUntypedApis || hasUntypedDependencies || hasMixedSummary;
}

function isAnalysisLegacy(doc) {
  if (!doc) {
    return false;
  }

  const categories = ["security", "performance", "scalability", "reliability"];
  const hasLegacyBreakdown = categories.some((category) => Array.isArray(doc.breakdown?.[category]));
  const hasMissingTypedBreakdown = categories.some((category) => !doc.breakdown?.[category]?.rules);

  return hasLegacyBreakdown || hasMissingTypedBreakdown;
}

function normalizeArchitectureDoc(doc) {
  const services = Array.isArray(doc.services)
    ? doc.services.map((entry) => normalizeNodeWithFile(entry, "service")).filter(Boolean)
    : [];
  const apis = Array.isArray(doc.apis) ? doc.apis.map(normalizeApi).filter(Boolean) : [];
  const dependencies = Array.isArray(doc.dependencies)
    ? doc.dependencies.map(normalizeDependency).filter(Boolean)
    : [];
  const databaseInteractions = Array.isArray(doc.databaseInteractions)
    ? doc.databaseInteractions.map(normalizeDatabaseInteraction).filter(Boolean)
    : [];
  const fileTree = Array.isArray(doc.fileTree)
    ? doc.fileTree.map(normalizeFileTreeNode).filter(Boolean)
    : [];

  return {
    _id: doc._id,
    projectId: doc.projectId,
    services,
    apis,
    dependencies,
    databaseInteractions,
    fileTree,
    summary: {
      totalFiles: normalizeNumber(doc.summary?.totalFiles, fileTree.length),
      totalDirectories: normalizeNumber(doc.summary?.totalDirectories, 0),
      middlewareCount: normalizeNumber(doc.summary?.middlewareCount, 0)
    },
    createdAt: doc.createdAt || new Date(),
    updatedAt: new Date()
  };
}

function normalizeAnalysisDoc(doc) {
  const issues = Array.isArray(doc.issues) ? doc.issues.map(normalizeIssue).filter(Boolean) : [];
  const categories = ["security", "performance", "scalability", "reliability"];

  const breakdown = Object.fromEntries(
    categories.map((category) => [
      category,
      normalizeCategoryBreakdown(doc.breakdown?.[category], category)
    ])
  );

  return {
    _id: doc._id,
    projectId: doc.projectId,
    score: normalizeNumber(doc.score, 0),
    security: normalizeNumber(doc.security, 0),
    performance: normalizeNumber(doc.performance, 0),
    scalability: normalizeNumber(doc.scalability, 0),
    reliability: normalizeNumber(doc.reliability, 0),
    issues,
    breakdown,
    createdAt: doc.createdAt || new Date(),
    updatedAt: new Date()
  };
}

function pickCanonicalDocument(project, docs, projectRefKey) {
  const referencedId = project?.[projectRefKey] ? String(project[projectRefKey]) : null;

  return [...docs].sort((left, right) => {
    const leftIsReferenced = referencedId && String(left._id) === referencedId ? 1 : 0;
    const rightIsReferenced = referencedId && String(right._id) === referencedId ? 1 : 0;

    if (leftIsReferenced !== rightIsReferenced) {
      return rightIsReferenced - leftIsReferenced;
    }

    const leftCompleteness = JSON.stringify(left).length;
    const rightCompleteness = JSON.stringify(right).length;

    if (leftCompleteness !== rightCompleteness) {
      return rightCompleteness - leftCompleteness;
    }

    return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
  })[0];
}

async function backupDocuments(backupCollection, operation, type, docs, options) {
  if (options.dryRun || docs.length === 0) {
    return;
  }

  await backupCollection.insertMany(
    docs.map((doc) => ({
      runId: options.runId,
      operation,
      type,
      originalId: doc._id,
      projectId: doc.projectId || null,
      capturedAt: new Date(),
      document: doc
    }))
  );
}

async function migrateChildCollection({
  collectionName,
  projectRefKey,
  normalizeDocument,
  isLegacyDocument,
  projectsById,
  summary,
  options
}) {
  const collection = mongoose.connection.db.collection(collectionName);
  const backupCollection = mongoose.connection.db.collection("migration_backups");
  const rawDocuments = await collection.find({}).toArray();
  const groupedByProject = new Map();

  rawDocuments.forEach((doc) => {
    const projectId = asObjectId(doc.projectId);

    if (!projectId) {
      summary.skipped.push({
        type: collectionName,
        id: String(doc._id),
        reason: "Missing or invalid projectId"
      });
      return;
    }

    const key = String(projectId);
    if (!groupedByProject.has(key)) {
      groupedByProject.set(key, []);
    }

    groupedByProject.get(key).push({
      ...doc,
      projectId
    });
  });

  for (const [projectId, docs] of groupedByProject.entries()) {
    const project = projectsById.get(projectId);

    if (!project) {
      summary.skipped.push({
        type: collectionName,
        id: docs.map((doc) => String(doc._id)).join(","),
        reason: "Referenced project does not exist"
      });
      continue;
    }

    const canonical = pickCanonicalDocument(project, docs, projectRefKey);
    const duplicates = docs.filter((doc) => String(doc._id) !== String(canonical._id));

    let normalized;
    try {
      normalized = normalizeDocument(canonical);
    } catch (error) {
      summary.skipped.push({
        type: collectionName,
        id: String(canonical._id),
        reason: `Normalization failed: ${error.message}`
      });
      continue;
    }

    const requiresNormalization = isLegacyDocument(canonical);
    const requiresProjectRefUpdate =
      !project[projectRefKey] || String(project[projectRefKey]) !== String(canonical._id);

    if (!requiresNormalization && duplicates.length === 0 && !requiresProjectRefUpdate) {
      summary.skipped.push({
        type: collectionName,
        id: String(canonical._id),
        reason: "Already normalized"
      });
      continue;
    }

    summary.migrated.push({
      type: collectionName,
      id: String(canonical._id),
      projectId,
      normalized: requiresNormalization,
      duplicatesRemoved: duplicates.length,
      projectReferenceUpdated: requiresProjectRefUpdate
    });

    if (options.dryRun) {
      continue;
    }

    await backupDocuments(backupCollection, "update", collectionName, [canonical], options);
    await collection.replaceOne({ _id: canonical._id }, normalized, { upsert: false });

    if (duplicates.length > 0) {
      await backupDocuments(backupCollection, "delete-duplicate", collectionName, duplicates, options);
      await collection.deleteMany({
        _id: {
          $in: duplicates.map((doc) => doc._id)
        }
      });
    }

    if (requiresProjectRefUpdate) {
      await mongoose.connection.db.collection("projects").updateOne(
        { _id: project._id },
        {
          $set: {
            [projectRefKey]: canonical._id
          }
        }
      );
    }
  }
}

async function migrateProjects(projectsById, summary, options) {
  const collection = mongoose.connection.db.collection("projects");
  const backupCollection = mongoose.connection.db.collection("migration_backups");

  for (const project of projectsById.values()) {
    const update = {};

    if (!project.lastAnalyzedAt) {
      update.lastAnalyzedAt = project.updatedAt || project.createdAt || new Date();
    }

    if (!project.sourceFingerprint && project.sourceType && project.sourceLocation) {
      update.sourceFingerprint = `${project.sourceType}:${project.sourceLocation}`.trim().toLowerCase();
    }

    if (Object.keys(update).length === 0) {
      summary.skipped.push({
        type: "projects",
        id: String(project._id),
        reason: "Already normalized"
      });
      continue;
    }

    summary.migrated.push({
      type: "projects",
      id: String(project._id),
      fieldsUpdated: Object.keys(update)
    });

    if (options.dryRun) {
      continue;
    }

    await backupDocuments(backupCollection, "update", "projects", [project], options);
    await collection.updateOne({ _id: project._id }, { $set: update });
  }
}

function printSummary(summary, options) {
  console.log(JSON.stringify({
    runId: options.runId,
    dryRun: options.dryRun,
    migratedCount: summary.migrated.length,
    skippedCount: summary.skipped.length,
    migrated: summary.migrated,
    skipped: summary.skipped
  }, null, 2));
}

async function runMigration({
  dryRun = false,
  runId = createRunId()
} = {}) {
  const options = { dryRun, runId };
  const summary = {
    migrated: [],
    skipped: []
  };

  if (mongoose.connection.readyState === 0) {
    await connectDatabase();
  }

  const projects = await mongoose.connection.db.collection("projects").find({}).toArray();
  const projectsById = new Map(projects.map((project) => [String(project._id), project]));

  await migrateProjects(projectsById, summary, options);

  await migrateChildCollection({
    collectionName: "architectures",
    projectRefKey: "architectureId",
    normalizeDocument: normalizeArchitectureDoc,
    isLegacyDocument: isArchitectureLegacy,
    projectsById,
    summary,
    options
  });

  await migrateChildCollection({
    collectionName: "analysisreports",
    projectRefKey: "analysisReportId",
    normalizeDocument: normalizeAnalysisDoc,
    isLegacyDocument: isAnalysisLegacy,
    projectsById,
    summary,
    options
  });

  return {
    ...summary,
    runId
  };
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  const runId = createRunId();

  runMigration({ dryRun, runId })
    .then((summary) => {
      printSummary(summary, { dryRun, runId });
    })
    .catch((error) => {
      console.error(
        JSON.stringify(
          {
            runId,
            dryRun,
            status: "failed",
            message: error.message,
            stack: error.stack
          },
          null,
          2
        )
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = {
  createRunId,
  normalizeArchitectureDoc,
  normalizeAnalysisDoc,
  isArchitectureLegacy,
  isAnalysisLegacy,
  runMigration
};
