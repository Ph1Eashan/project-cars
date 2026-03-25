const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const AdmZip = require("adm-zip");

const { buildArchitectureGraph } = require("./architecture-mapper.service");
const { generateReport } = require("./analysis-engine.service");
const { analyzeNodeRepository, analyzeJavaRepository } = require("./analyzers");
const {
  ensureDirectoryExists,
  removePathIfExists,
  readFilesRecursively,
  createFileTree
} = require("../utils/file.utils");
const { resolveFromBackend } = require("../utils/project-paths");

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

function toRepoArchiveUrl(repoUrl) {
  const normalizedUrl = repoUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const mainArchiveUrl = `${normalizedUrl}/archive/refs/heads/main.zip`;
  const masterArchiveUrl = `${normalizedUrl}/archive/refs/heads/master.zip`;

  return {
    mainArchiveUrl,
    masterArchiveUrl
  };
}

async function downloadRepository(repoUrl) {
  ensureDirectoryExists("tmp");

  const { mainArchiveUrl, masterArchiveUrl } = toRepoArchiveUrl(repoUrl);
  const downloadTargets = [mainArchiveUrl, masterArchiveUrl];
  const zipPath = resolveFromBackend("tmp", `repo-${Date.now()}.zip`);

  let downloaded = false;

  for (const target of downloadTargets) {
    try {
      // GitHub repos can default to either main or master, so we try both archive URLs.
      const response = await axios.get(target, { responseType: "arraybuffer", timeout: 15000 });
      fs.writeFileSync(zipPath, response.data);
      downloaded = true;
      break;
    } catch (error) {
      downloaded = false;
    }
  }

  if (!downloaded) {
    const error = new Error("Failed to download the GitHub repository archive");
    error.statusCode = 400;
    throw error;
  }

  return zipPath;
}

function extractZip(zipPath) {
  const extractRoot = fs.mkdtempSync(path.join(os.tmpdir(), "project-cars-"));
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractRoot, true);

  const entries = fs.readdirSync(extractRoot);
  if (entries.length === 1) {
    return {
      scanPath: path.join(extractRoot, entries[0]),
      cleanupPath: extractRoot
    };
  }

  return {
    scanPath: extractRoot,
    cleanupPath: extractRoot
  };
}

function detectProjectLanguage(scannedFiles) {
  const filePaths = scannedFiles.map((file) => file.path.toLowerCase());
  const hasNode = filePaths.some((filePath) => filePath.endsWith("/package.json") || filePath === "package.json");
  const hasJava = filePaths.some(
    (filePath) =>
      filePath.endsWith("/pom.xml") ||
      filePath === "pom.xml" ||
      filePath.endsWith("/build.gradle") ||
      filePath === "build.gradle"
  );

  if (hasNode && hasJava) {
    return "Polyglot (Node.js, Java)";
  }

  if (hasNode) {
    return "Node.js";
  }

  if (hasJava) {
    return "Java";
  }

  return "Unknown";
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countDirectories(tree) {
  let total = 0;

  tree.forEach((node) => {
    if (node.type === "directory") {
      total += 1;
      total += countDirectories(node.children || []);
    }
  });

  return total;
}

function createBaseScanContext(sourcePath) {
  const files = readFilesRecursively(sourcePath, IGNORED_DIRECTORIES);
  const scannedFiles = [];

  files.forEach((file) => {
    const relativeFile = path.relative(sourcePath, file);
    const content = fs.readFileSync(file, "utf-8");

    scannedFiles.push({
      path: relativeFile,
      content
    });
  });

  const detectedLanguage = detectProjectLanguage(scannedFiles);
  const totalFiles = files.length;
  const fileTree = createFileTree(sourcePath, IGNORED_DIRECTORIES);
  const totalDirectories = countDirectories(fileTree);

  return {
    files: scannedFiles,
    detectedLanguage,
    fileTree,
    totalFiles,
    totalDirectories
  };
}

function mergeAnalyzerResults(results) {
  const merged = {
    services: dedupeBy(results.flatMap((result) => result.services || []), (item) => `${item.file}:${item.name}`),
    repositories: dedupeBy(results.flatMap((result) => result.repositories || []), (item) => `${item.file}:${item.name}`),
    apis: dedupeBy(results.flatMap((result) => result.apis || []), (item) => `${item.method}:${item.path}:${item.file}`),
    dependencies: dedupeBy(results.flatMap((result) => result.dependencies || []), (item) => `${item.from}:${item.to}`),
    databaseInteractions: dedupeBy(
      results.flatMap((result) => result.databaseInteractions || []),
      (item) => `${item.file}:${item.type}`
    ),
    middleware: dedupeBy(results.flatMap((result) => result.middleware || []), (item) => `${item.file}:${item.name}`),
    authSignals: [...new Set(results.flatMap((result) => result.authSignals || []))],
    validationSignals: [...new Set(results.flatMap((result) => result.validationSignals || []))],
    cachingSignals: [...new Set(results.flatMap((result) => result.cachingSignals || []))],
    rateLimitSignals: [...new Set(results.flatMap((result) => result.rateLimitSignals || []))],
    asyncMessagingSignals: [...new Set(results.flatMap((result) => result.asyncMessagingSignals || []))],
    errorHandlingSignals: [...new Set(results.flatMap((result) => result.errorHandlingSignals || []))],
    monitoringSignals: [...new Set(results.flatMap((result) => result.monitoringSignals || []))],
    statefulSignals: [...new Set(results.flatMap((result) => result.statefulSignals || []))],
    externalCallSignals: [...new Set(results.flatMap((result) => result.externalCallSignals || []))],
    resilienceSignals: [...new Set(results.flatMap((result) => result.resilienceSignals || []))],
    asyncWrapperSignals: [...new Set(results.flatMap((result) => result.asyncWrapperSignals || []))],
    healthEndpointSignals: [...new Set(results.flatMap((result) => result.healthEndpointSignals || []))],
    blockingPatterns: dedupeBy(
      results.flatMap((result) => result.blockingPatterns || []),
      (item) => `${item.file}:${item.pattern}`
    ),
    tryCatchCount: results.reduce((sum, result) => sum + (result.tryCatchCount || 0), 0)
  };

  return merged;
}

function routeAnalyzers(detectedLanguage, scannedFiles) {
  if (detectedLanguage === "Node.js") {
    return [analyzeNodeRepository(scannedFiles)];
  }

  if (detectedLanguage === "Java") {
    return [analyzeJavaRepository(scannedFiles)];
  }

  if (detectedLanguage === "Polyglot (Node.js, Java)") {
    return [analyzeNodeRepository(scannedFiles), analyzeJavaRepository(scannedFiles)];
  }

  return [analyzeNodeRepository(scannedFiles)];
}

function scanRepository(sourcePath) {
  const baseContext = createBaseScanContext(sourcePath);
  const analyzerResults = routeAnalyzers(baseContext.detectedLanguage, baseContext.files);
  const merged = mergeAnalyzerResults(analyzerResults);

  return {
    files: baseContext.files,
    ...merged,
    detectedLanguage: baseContext.detectedLanguage,
    fileTree: baseContext.fileTree,
    totalFiles: baseContext.totalFiles,
    totalDirectories: baseContext.totalDirectories
  };
}

async function analyzeSource({ repoUrl, zipFile }) {
  let temporaryZipPath = null;
  let extracted = null;
  let sourceType = "zip";
  let sourceLocation = zipFile ? zipFile.path : "";

  try {
    if (repoUrl) {
      sourceType = "github";
      sourceLocation = repoUrl;
      temporaryZipPath = await downloadRepository(repoUrl);
      extracted = extractZip(temporaryZipPath);
    } else if (zipFile) {
      extracted = extractZip(zipFile.path);
    } else {
      const error = new Error("Provide a GitHub repository URL or a zip file");
      error.statusCode = 400;
      throw error;
    }

    const scanResult = scanRepository(extracted.scanPath);
    const architecture = buildArchitectureGraph(scanResult);
    // The analysis report is heuristic-based so the API stays fast and easy to extend.
    const analysisReport = generateReport(scanResult);

    return {
      projectName: path.basename(extracted.scanPath),
      sourceType,
      sourceLocation,
      architecture,
      analysisReport
    };
  } finally {
    if (temporaryZipPath) {
      removePathIfExists(temporaryZipPath);
    }

    if (zipFile && zipFile.path) {
      removePathIfExists(zipFile.path);
    }

    if (extracted && extracted.cleanupPath) {
      removePathIfExists(extracted.cleanupPath);
    }
  }
}

module.exports = {
  analyzeSource,
  createBaseScanContext,
  detectProjectLanguage,
  mergeAnalyzerResults,
  routeAnalyzers,
  scanRepository
};
