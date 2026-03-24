const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const AdmZip = require("adm-zip");

const { buildArchitectureGraph } = require("./architecture-mapper.service");
const { generateReport } = require("./analysis-engine.service");
const {
  ensureDirectoryExists,
  removePathIfExists,
  readFilesRecursively,
  createFileTree
} = require("../utils/file.utils");

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
  const zipPath = path.join(process.cwd(), "tmp", `repo-${Date.now()}.zip`);

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

function detectApiDefinitions(content) {
  const apiRegex = /\b(router|app)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const apis = [];
  let match;

  while ((match = apiRegex.exec(content)) !== null) {
    apis.push({
      method: match[2].toUpperCase(),
      path: match[3]
    });
  }

  return apis;
}

function detectDependencies(content) {
  const dependencyRegex = /\brequire\(["'`](.+?)["'`]\)|\bfrom\s+["'`](.+?)["'`]/g;
  const dependencies = [];
  let match;

  while ((match = dependencyRegex.exec(content)) !== null) {
    dependencies.push(match[1] || match[2]);
  }

  return dependencies;
}

function scanRepository(sourcePath) {
  const files = readFilesRecursively(sourcePath, IGNORED_DIRECTORIES);
  const scannedFiles = [];
  const services = [];
  const apis = [];
  const dependencies = [];
  const databaseInteractions = [];
  const middleware = [];
  const blockingPatterns = [];
  const authSignals = [];
  const validationSignals = [];
  const cachingSignals = [];
  const asyncMessagingSignals = [];
  const errorHandlingSignals = [];
  const monitoringSignals = [];
  const statefulSignals = [];
  const externalCallSignals = [];
  const resilienceSignals = [];
  const asyncWrapperSignals = [];
  const healthEndpointSignals = [];
  let tryCatchCount = 0;

  files.forEach((file) => {
    const relativeFile = path.relative(sourcePath, file);
    const content = fs.readFileSync(file, "utf-8");
    const lowerFile = relativeFile.toLowerCase();

    scannedFiles.push({
      path: relativeFile,
      content
    });

    if (lowerFile.includes("service")) {
      services.push({
        name: path.basename(relativeFile, path.extname(relativeFile)),
        file: relativeFile
      });
    }

    if (lowerFile.includes("middleware")) {
      middleware.push({
        name: path.basename(relativeFile, path.extname(relativeFile)),
        file: relativeFile
      });
    }

    // Build a lightweight architecture graph from route declarations and imports.
    detectApiDefinitions(content).forEach((api) => {
      apis.push({
        ...api,
        file: relativeFile
      });
    });

    detectDependencies(content).forEach((dependency) => {
      dependencies.push({
        from: relativeFile,
        to: dependency
      });
    });

    if (/\bmongoose\b|\bsequelize\b|\bprisma\b|\bmongodb\b|\bknex\b/i.test(content)) {
      databaseInteractions.push({
        file: relativeFile,
        type: "database-library"
      });
    }

    if (/\bfindOne\b|\bfind\b|\baggregate\b|\binsertOne\b|\bcreate\b|\bupdateOne\b|\bsave\b/.test(content)) {
      databaseInteractions.push({
        file: relativeFile,
        type: "query-operation"
      });
    }

    if (/\bauth\b|\bjwt\b|\bpassport\b|\bprotect(ed)?\b/i.test(content) || /\bauth\b/i.test(lowerFile)) {
      authSignals.push(relativeFile);
    }

    if (/\bjoi\b|\bzod\b|\bexpress-validator\b|\bvalidator\b/i.test(content)) {
      validationSignals.push(relativeFile);
    }

    if (/\bredis\b|\bnode-cache\b|\bapicache\b|\bcache-manager\b/i.test(content)) {
      cachingSignals.push(relativeFile);
    }

    if (/\bbull\b|\bbullmq\b|\bkafka\b|\brabbitmq\b|\bsqs\b/i.test(content)) {
      asyncMessagingSignals.push(relativeFile);
    }

    if (/\bnext\s*\(\s*err\b|\berrorHandler\b|\bapp\.use\s*\(\s*\(|\berror\.middleware\b/i.test(content) || lowerFile.includes("error.middleware")) {
      errorHandlingSignals.push(relativeFile);
    }

    if (/\bmorgan\b|\bwinston\b|\bpino\b|\bprom-client\b|\bopentelemetry\b|\bsentry\b/i.test(content)) {
      monitoringSignals.push(relativeFile);
    }

    if (/\bexpress-session\b|\bsessionStore\b|\bglobalState\b|\binMemoryCache\b|\bMap\(\)|\bnew Map\(\)/.test(content)) {
      statefulSignals.push(relativeFile);
    }

    if (/\baxios\.\w+\b|\bfetch\s*\(|\bgot\.\w+\b|\brequest\(/.test(content)) {
      externalCallSignals.push(relativeFile);
    }

    if (/\btimeout\b|\bretry\b|\bcircuitBreaker\b|\bbackoff\b/i.test(content)) {
      resilienceSignals.push(relativeFile);
    }

    if (/\basyncHandler\b|\bcatchAsync\b|\bexpress-async-handler\b/i.test(content)) {
      asyncWrapperSignals.push(relativeFile);
    }

    if (/(\/health|\/ready|\/live)/.test(content)) {
      healthEndpointSignals.push(relativeFile);
    }

    if (/\btry\s*\{/.test(content)) {
      tryCatchCount += (content.match(/\btry\s*\{/g) || []).length;
    }

    const syncPatterns = ["readFileSync", "writeFileSync", "execSync"];
    syncPatterns.forEach((pattern) => {
      if (content.includes(pattern)) {
        blockingPatterns.push({
          file: relativeFile,
          pattern
        });
      }
    });
  });

  const totalFiles = files.length;
  const fileTree = createFileTree(sourcePath, IGNORED_DIRECTORIES);
  const totalDirectories = countDirectories(fileTree);

  return {
    files: scannedFiles,
    services,
    apis,
    dependencies,
    databaseInteractions,
    middleware,
    authSignals,
    validationSignals,
    cachingSignals,
    asyncMessagingSignals,
    errorHandlingSignals,
    monitoringSignals,
    statefulSignals,
    externalCallSignals,
    resilienceSignals,
    asyncWrapperSignals,
    healthEndpointSignals,
    blockingPatterns,
    tryCatchCount,
    fileTree,
    totalFiles,
    totalDirectories
  };
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
  analyzeSource
};
