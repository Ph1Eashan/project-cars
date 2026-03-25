const { CATEGORY_CONFIG } = require("./analysis-rules");
const { evaluateRuleSet } = require("./rule-engine.service");

function normalizeSummaryMessage(message) {
  if (!message) {
    return "";
  }

  const trimmed = message.trim().replace(/\.$/, "");
  if (!trimmed) {
    return "";
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function hasNoBackendSignals(scanResult) {
  return (
    (scanResult.apis?.length || 0) === 0 &&
    (scanResult.services?.length || 0) === 0 &&
    (scanResult.databaseInteractions?.length || 0) === 0
  );
}

function hasMinimalBackendSurface(scanResult) {
  const apiCount = scanResult.apis?.length || 0;
  const serviceCount = scanResult.services?.length || 0;
  const dbCount = scanResult.databaseInteractions?.length || 0;
  return apiCount + serviceCount + dbCount <= 2;
}

function buildTopIssues(ruleResults) {
  return (Array.isArray(ruleResults) ? ruleResults : [])
    .filter((result) => !result.passed)
    .sort((left, right) => right.impact - left.impact)
    .slice(0, 3)
    .map((result) => ({
      rule: result.name,
      impact: result.impact,
      severity: result.severity,
      message: result.message,
      recommendation: result.recommendation
    }));
}

function buildSummary(ruleEvaluation) {
  const topIssues = buildTopIssues(ruleEvaluation.results);

  if (topIssues.length === 0) {
    return "Authentication, performance, scalability, and reliability checks all look healthy.";
  }

  const summaryParts = topIssues
    .slice(0, 2)
    .map((issue) => normalizeSummaryMessage(issue.message))
    .filter(Boolean);

  if (summaryParts.length === 0) {
    return "The analysis detected backend issues that should be reviewed.";
  }

  return `${summaryParts.join(". ")}.`;
}

function buildFallbackSummary(scanResult, analysisConfidence) {
  if (analysisConfidence === "low") {
    return "No backend signals were detected, so this analysis has low confidence.";
  }

  if (analysisConfidence === "medium") {
    return "Only a minimal backend surface was detected, so the analysis should be treated as directional.";
  }

  return null;
}

function buildAnalysisMetadata(ruleResults) {
  const topIssues = buildTopIssues(ruleResults);
  return {
    summary: buildSummary({ results: Array.isArray(ruleResults) ? ruleResults : [] }),
    topIssues
  };
}

function buildSystemClassification(categoryScores) {
  const entries = Object.entries(categoryScores || {});
  if (entries.length === 0) {
    return "Balanced system";
  }

  const sorted = [...entries].sort((left, right) => right[1] - left[1]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const strengthLabels = {
    security: "Secure",
    performance: "Fast",
    scalability: "Scalable",
    reliability: "Stable"
  };

  const weaknessLabels = {
    security: "security exposed",
    performance: "performance constrained",
    scalability: "scaling limited",
    reliability: "reliability fragile"
  };

  if (sorted.every(([, score]) => score >= 85)) {
    return "Balanced and production-ready";
  }

  if (weakest[1] >= 75) {
    return "Mostly balanced system";
  }

  if (strongest[0] !== weakest[0] && strongest[1] >= 80) {
    return `${strengthLabels[strongest[0]]} but ${weaknessLabels[weakest[0]]}`;
  }

  return weaknessLabels[weakest[0]].charAt(0).toUpperCase() + weaknessLabels[weakest[0]].slice(1);
}

function determineAnalysisConfidence(scanResult) {
  if (hasNoBackendSignals(scanResult)) {
    return "low";
  }

  if (hasMinimalBackendSurface(scanResult)) {
    return "medium";
  }

  return "high";
}

function buildConfidenceAdjustedClassification(scanResult, categoryScores, analysisConfidence) {
  if (analysisConfidence === "low") {
    return "No backend detected";
  }

  if (analysisConfidence === "medium") {
    return "Minimal backend surface";
  }

  return buildSystemClassification(categoryScores);
}

function buildConfidenceAdjustedScore(overallScore, analysisConfidence) {
  if (analysisConfidence === "low") {
    return Math.min(overallScore, 35);
  }

  if (analysisConfidence === "medium") {
    return Math.min(overallScore, 70);
  }

  return overallScore;
}

function generateReport(scanResult) {
  const ruleEvaluation = evaluateRuleSet(CATEGORY_CONFIG, scanResult);
  const topIssues = buildTopIssues(ruleEvaluation.results);
  const analysisConfidence = determineAnalysisConfidence(scanResult);
  const fallbackSummary = buildFallbackSummary(scanResult, analysisConfidence);
  const score = buildConfidenceAdjustedScore(ruleEvaluation.overallScore, analysisConfidence);

  return {
    score,
    security: ruleEvaluation.categoryScores.security,
    performance: ruleEvaluation.categoryScores.performance,
    scalability: ruleEvaluation.categoryScores.scalability,
    reliability: ruleEvaluation.categoryScores.reliability,
    categoryScores: ruleEvaluation.categoryScores,
    analysisConfidence,
    systemClassification: buildConfidenceAdjustedClassification(
      scanResult,
      ruleEvaluation.categoryScores,
      analysisConfidence
    ),
    metadata: {
      detectedLanguage: scanResult.detectedLanguage || "Unknown"
    },
    summary: fallbackSummary || buildSummary(ruleEvaluation),
    topIssues,
    issues: ruleEvaluation.issues,
    results: ruleEvaluation.results.map((result) => ({
      name: result.name,
      category: result.category,
      weight: result.weight,
      passed: result.passed,
      impact: result.impact,
      severity: result.severity,
      message: result.message,
      recommendation: result.recommendation,
      ruleId: result.ruleId
    })),
    breakdown: ruleEvaluation.breakdown
  };
}

module.exports = {
  buildAnalysisMetadata,
  buildConfidenceAdjustedClassification,
  buildConfidenceAdjustedScore,
  buildFallbackSummary,
  buildSummary,
  buildTopIssues,
  buildSystemClassification,
  determineAnalysisConfidence,
  generateReport
};
