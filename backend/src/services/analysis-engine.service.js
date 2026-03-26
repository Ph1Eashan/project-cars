const { CATEGORY_CONFIG } = require("./analysis-rules");
const { evaluateRuleSet } = require("./rule-engine.service");
const { mapRulesToCarState } = require("./car-mapping.service");

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

function normalizeSummaryComparisonKey(message) {
  return normalizeSummaryMessage(message)
    .toLowerCase()
    .replace(/[^a-z0-9%\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRecommendationComparisonKey(message) {
  return (message || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(add|use|implement|introduce|review|consider|move|protect|wrap|keep)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function areSummaryMessagesSimilar(left, right) {
  const normalizedLeft = normalizeSummaryComparisonKey(left);
  const normalizedRight = normalizeSummaryComparisonKey(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) {
    return true;
  }

  const leftTokens = new Set(normalizedLeft.split(" "));
  const rightTokens = new Set(normalizedRight.split(" "));
  const overlapCount = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const denominator = Math.max(leftTokens.size, rightTokens.size, 1);

  return overlapCount / denominator >= 0.72;
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

function getOrderedFailedResults(ruleResults) {
  const seenRootCauses = new Set();

  return (Array.isArray(ruleResults) ? ruleResults : [])
    .filter((result) => !result.passed)
    .sort((left, right) => right.impact - left.impact)
    .filter((result) => {
      const rootCauseKey = result.rootCauseKey || result.ruleId;
      if (seenRootCauses.has(rootCauseKey)) {
        return false;
      }

      seenRootCauses.add(rootCauseKey);
      return true;
    })
    .map((result) => ({
      ...result,
      message: normalizeSummaryMessage(result.message)
    }));
}

function buildTopIssues(ruleResults) {
  return getOrderedFailedResults(ruleResults)
    .slice(0, 3)
    .map((result) => ({
      rule: result.name,
      impact: result.impact,
      severity: result.severity,
      message: result.message,
      recommendation: result.recommendation
    }));
}

function buildTopRecommendations(ruleResults) {
  const seen = new Set();

  return getOrderedFailedResults(ruleResults)
    .map((result) => result.recommendation)
    .filter((recommendation) => {
      const normalizedRecommendation = normalizeRecommendationComparisonKey(recommendation);

      if (!recommendation || !normalizedRecommendation || seen.has(normalizedRecommendation)) {
        return false;
      }

      seen.add(normalizedRecommendation);
      return true;
    })
    .slice(0, 3);
}

function buildWorstRoutes(debugValidation) {
  return (debugValidation?.routes || [])
    .map((route) => ({
      path: route.path,
      dbCallCount: route.dbCallCount || 0,
      bottleneckCount: route.bottleneckCount || 0
    }))
    .sort(
      (left, right) =>
        right.dbCallCount + right.bottleneckCount - (left.dbCallCount + left.bottleneckCount)
    )
    .slice(0, 3);
}

function dedupeSummaryMessages(messages) {
  return messages.reduce((uniqueMessages, message) => {
    const normalizedMessage = normalizeSummaryMessage(message);
    if (!normalizedMessage) {
      return uniqueMessages;
    }

    if (uniqueMessages.some((existingMessage) => areSummaryMessagesSimilar(existingMessage, normalizedMessage))) {
      return uniqueMessages;
    }

    return [...uniqueMessages, normalizedMessage];
  }, []);
}

function combineSummaryParts(summaryParts) {
  if (summaryParts.length === 0) {
    return "The analysis detected backend issues that should be reviewed.";
  }

  if (summaryParts.length === 1) {
    return `${summaryParts[0]}.`;
  }

  const [firstPart, secondPart] = summaryParts;
  const normalizedSecond = secondPart.charAt(0).toLowerCase() + secondPart.slice(1);
  return `${firstPart} and ${normalizedSecond}.`;
}

function buildSummary(ruleEvaluation) {
  const topIssues = getOrderedFailedResults(ruleEvaluation.results);

  if (topIssues.length === 0) {
    return "Authentication, performance, scalability, and reliability checks all look healthy.";
  }

  const summaryParts = dedupeSummaryMessages(
    topIssues
    .slice(0, 2)
    .map((issue) => issue.message)
  );

  return combineSummaryParts(summaryParts);
}

function applyBrokenComponentPenalty(score, ruleResults) {
  const carView = mapRulesToCarState(ruleResults || []);
  const brokenComponents = Object.entries(carView.car || {})
    .filter(([, component]) => component.status === "broken")
    .map(([component]) => component);

  if (brokenComponents.length === 0) {
    return score;
  }

  let adjustedScore = score - brokenComponents.length * 6;

  if (brokenComponents.includes("engine")) {
    adjustedScore = Math.min(adjustedScore - 8, 64);
  }

  if (brokenComponents.includes("transmission")) {
    adjustedScore = Math.min(adjustedScore - 8, 64);
  }

  return Math.max(0, adjustedScore);
}

function computeRouteWeight(route) {
  return (route.dbCallCount || 0) * 2 + (route.bottleneckCount || 0) * 3;
}

function applyRouteWeightedPenalty(score, debugValidation) {
  const worstRoutes = buildWorstRoutes(debugValidation);
  const penalty = worstRoutes.reduce((total, route) => {
    const routeWeight = computeRouteWeight(route);
    if (routeWeight < 4) {
      return total;
    }

    return total + Math.min(8, Math.floor(routeWeight / 3));
  }, 0);

  return Math.max(0, score - penalty);
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
    topIssues,
    recommendations: buildTopRecommendations(ruleResults)
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
  const recommendations = buildTopRecommendations(ruleEvaluation.results);
  const worstRoutes = buildWorstRoutes(scanResult.debugValidation);
  const analysisConfidence = determineAnalysisConfidence(scanResult);
  const fallbackSummary = buildFallbackSummary(scanResult, analysisConfidence);
  const brokenPenaltyScore = applyBrokenComponentPenalty(ruleEvaluation.overallScore, ruleEvaluation.results);
  const baseScore = applyRouteWeightedPenalty(brokenPenaltyScore, scanResult.debugValidation);
  const score = buildConfidenceAdjustedScore(baseScore, analysisConfidence);
  const criticalIssues = ruleEvaluation.results.filter(
    (result) => !result.passed && result.severity === "high"
  ).length;

  return {
    score,
    security: ruleEvaluation.categoryScores.security,
    performance: ruleEvaluation.categoryScores.performance,
    scalability: ruleEvaluation.categoryScores.scalability,
    reliability: ruleEvaluation.categoryScores.reliability,
    categoryScores: ruleEvaluation.categoryScores,
    analysisConfidence,
    criticalIssues,
    systemClassification: buildConfidenceAdjustedClassification(
      scanResult,
      ruleEvaluation.categoryScores,
      analysisConfidence
    ),
    metadata: {
      detectedLanguage: scanResult.detectedLanguage || "Unknown",
      recommendations,
      debugValidation: scanResult.debugValidation || {
        routeCount: 0,
        detectedRoutes: [],
        dbCallCount: 0,
        bottleneckCount: 0
      }
    },
    summary: fallbackSummary || buildSummary(ruleEvaluation),
    topIssues,
    worstRoutes,
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
  applyBrokenComponentPenalty,
  applyRouteWeightedPenalty,
  buildAnalysisMetadata,
  buildConfidenceAdjustedClassification,
  buildConfidenceAdjustedScore,
  buildFallbackSummary,
  buildTopRecommendations,
  buildWorstRoutes,
  buildSummary,
  buildTopIssues,
  buildSystemClassification,
  determineAnalysisConfidence,
  generateReport
};
