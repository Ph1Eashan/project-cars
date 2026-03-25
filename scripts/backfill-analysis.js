#!/usr/bin/env node

require("dotenv").config({ path: require("path").resolve(__dirname, "../backend/.env") });

const mongoose = require("mongoose");

const connectDatabase = require("../backend/src/config/database");
const Project = require("../backend/src/models/project.model");
const Architecture = require("../backend/src/models/architecture.model");
const AnalysisReport = require("../backend/src/models/analysis-report.model");
const { generateReport, buildAnalysisMetadata } = require("../backend/src/services/analysis-engine.service");

function buildRuleMap(results = []) {
  return new Map(results.map((result) => [result.ruleId, result]));
}

function getRuleResult(ruleMap, ruleId) {
  return ruleMap.get(ruleId) || null;
}

function didRulePass(ruleMap, ruleId) {
  const result = getRuleResult(ruleMap, ruleId);
  return Boolean(result && result.passed);
}

function didRuleFail(ruleMap, ruleId) {
  const result = getRuleResult(ruleMap, ruleId);
  return Boolean(result && !result.passed);
}

function createDerivedItems(count, prefix, factory) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => factory(index, `${prefix}-${index + 1}`));
}

function deriveBlockingPatterns(ruleMap) {
  const blockingRule = getRuleResult(ruleMap, "performance.blocking-operations");
  if (blockingRule && !blockingRule.passed) {
    const count = Math.max(1, Math.ceil((blockingRule.impact || 0) / 8));
    return createDerivedItems(count, "derived-blocking", (_, label) => ({
      file: `${label}.js`,
      pattern: "fs.readFileSync"
    }));
  }

  if (didRuleFail(ruleMap, "scalability.synchronous-flows")) {
    return createDerivedItems(2, "derived-sync-flow", (_, label) => ({
      file: `${label}.js`,
      pattern: "synchronous-operation"
    }));
  }

  return [];
}

function deriveTryCatchCount(ruleMap, apiCount) {
  const sparseHandlingRule = getRuleResult(ruleMap, "reliability.sparse-defensive-handling");
  if (!sparseHandlingRule) {
    return 0;
  }

  if (sparseHandlingRule.passed) {
    return Math.max(1, Math.ceil(apiCount * 0.35));
  }

  const message = sparseHandlingRule.message || "";
  const match = message.match(/Only\s+(\d+)\s+try\/catch blocks/i);
  if (match) {
    return Number(match[1]);
  }

  return 0;
}

function deriveScanResult(architecture, analysisReport) {
  const apis = Array.isArray(architecture.apis) ? architecture.apis : [];
  const services = Array.isArray(architecture.services) ? architecture.services : [];
  const dependencies = Array.isArray(architecture.dependencies) ? architecture.dependencies : [];
  const databaseInteractions = Array.isArray(architecture.databaseInteractions)
    ? architecture.databaseInteractions
    : [];
  const fileTree = Array.isArray(architecture.fileTree) ? architecture.fileTree : [];
  const ruleMap = buildRuleMap(analysisReport.results);
  const hasApis = apis.length > 0;
  const getCount = apis.filter((api) => api.method === "GET").length;
  const serviceComplexity = services.length + apis.length;

  const authSignals = hasApis && didRulePass(ruleMap, "security.missing-auth") ? ["derived-auth-signal"] : [];
  const validationSignals =
    hasApis && didRulePass(ruleMap, "security.missing-validation") ? ["derived-validation-signal"] : [];
  const cachingSignals =
    ((getCount >= 3 && didRulePass(ruleMap, "performance.missing-caching")) ||
      (apis.length >= 8 && didRulePass(ruleMap, "performance.large-service-surface")))
      ? ["derived-cache-signal"]
      : [];
  const rateLimitSignals =
    hasApis && didRulePass(ruleMap, "security.missing-rate-limiting") ? ["derived-rate-limit-signal"] : [];
  const asyncMessagingSignals =
    serviceComplexity >= 6 && didRulePass(ruleMap, "scalability.missing-queues")
      ? ["derived-queue-signal"]
      : [];
  const errorHandlingSignals =
    hasApis && didRulePass(ruleMap, "reliability.missing-central-error-handler")
      ? ["derived-error-handler"]
      : [];
  const monitoringSignals =
    didRulePass(ruleMap, "reliability.missing-health-signals") ? ["derived-monitoring-signal"] : [];
  const healthEndpointSignals = apis
    .filter((api) => /^\/(health|status|ready|live)/i.test(api.path))
    .map((api) => api.path);
  const statefulSignals = didRuleFail(ruleMap, "scalability.stateful-implementation")
    ? ["derived-stateful-signal.js"]
    : [];
  const externalCallSignals = didRuleFail(ruleMap, "reliability.retry-gap") ? ["derived-external-call.js"] : [];
  const resilienceSignals =
    externalCallSignals.length > 0 && didRulePass(ruleMap, "reliability.retry-gap")
      ? ["derived-resilience-signal"]
      : [];
  const asyncWrapperSignals =
    didRulePass(ruleMap, "reliability.sparse-defensive-handling") && hasApis
      ? ["derived-async-wrapper"]
      : [];
  const blockingPatterns = deriveBlockingPatterns(ruleMap);

  return {
    files: [],
    services,
    apis,
    dependencies,
    databaseInteractions,
    middleware: [],
    authSignals,
    validationSignals,
    cachingSignals,
    rateLimitSignals,
    asyncMessagingSignals,
    errorHandlingSignals,
    monitoringSignals,
    statefulSignals,
    externalCallSignals,
    resilienceSignals,
    asyncWrapperSignals,
    healthEndpointSignals,
    blockingPatterns,
    tryCatchCount: deriveTryCatchCount(ruleMap, apis.length),
    fileTree,
    totalFiles: architecture.summary?.totalFiles || 0,
    totalDirectories: architecture.summary?.totalDirectories || 0
  };
}

async function backfillAnalysis({ dryRun = false } = {}) {
  const projects = await Project.find({}, { _id: 1 }).lean();
  const updatedProjectIds = [];
  const skipped = [];

  for (const project of projects) {
    const [architecture, report] = await Promise.all([
      Architecture.findOne({ projectId: project._id }).lean(),
      AnalysisReport.findOne({ projectId: project._id }).lean()
    ]);

    if (!architecture || !report) {
      skipped.push({
        projectId: String(project._id),
        reason: !architecture ? "Missing architecture document" : "Missing analysis report"
      });
      continue;
    }

    const hasStoredResults = Array.isArray(report.results) && report.results.length > 0;
    const nextMetadata = hasStoredResults
      ? (() => {
          const nextReport = generateReport(deriveScanResult(architecture, report));
          return {
            summary: nextReport.summary,
            topIssues: nextReport.topIssues
          };
        })()
      : buildAnalysisMetadata(report.results);

    if (!dryRun) {
      await AnalysisReport.updateOne(
        { _id: report._id },
        {
          $set: {
            summary: nextMetadata.summary,
            topIssues: nextMetadata.topIssues
          }
        }
      );
    }

    updatedProjectIds.push(String(project._id));
    console.log(`${dryRun ? "[dry-run] " : ""}updated project ${project._id}`);
  }

  return {
    totalProjects: projects.length,
    updatedCount: updatedProjectIds.length,
    skippedCount: skipped.length,
    updatedProjectIds,
    skipped
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  try {
    await connectDatabase();
    const summary = await backfillAnalysis({ dryRun });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  backfillAnalysis,
  deriveScanResult
};
