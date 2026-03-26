const path = require("path");
const { debugDetectedRoutes, getDetectedRoutes } = require("./analyzer-debug.helper");

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const QUERY_METHODS = [
  "findOne",
  "findById",
  "find",
  "aggregate",
  "insertOne",
  "insertMany",
  "create",
  "updateOne",
  "updateMany",
  "update",
  "save",
  "deleteOne",
  "deleteMany",
  "deleteById",
  "delete",
  "countDocuments"
];
const SYNC_PATTERNS = ["readFileSync", "writeFileSync", "appendFileSync", "execSync", "spawnSync"];

const NON_SOURCE_PATH_PATTERN = /(^|\/)(tests?|__tests__|fixtures|mocks|scripts)(\/|$)/i;

function normalizeFilePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function normalizeRoutePath(...segments) {
  const joined = segments
    .filter((segment) => typeof segment === "string" && segment.length > 0)
    .join("/");
  const normalized = joined.replace(/\/+/g, "/");
  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;

  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

function isAnalyzableSourceFile(filePath) {
  return !NON_SOURCE_PATH_PATTERN.test(filePath);
}

function resolveLocalModulePath(baseFilePath, requestPath, availableFiles) {
  if (!requestPath || !requestPath.startsWith(".")) {
    return null;
  }

  const baseDirectory = path.posix.dirname(baseFilePath);
  const resolvedBase = normalizeFilePath(path.posix.normalize(path.posix.join(baseDirectory, requestPath)));
  const candidates = [
    resolvedBase,
    `${resolvedBase}.js`,
    `${resolvedBase}.cjs`,
    `${resolvedBase}.mjs`,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    path.posix.join(resolvedBase, "index.js"),
    path.posix.join(resolvedBase, "index.cjs"),
    path.posix.join(resolvedBase, "index.mjs")
  ];

  return candidates.find((candidate) => availableFiles.has(candidate)) || null;
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

function extractImportedAliases(content, filePath, availableFiles) {
  const aliases = new Map();
  const requireRegex = /const\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  const importRegex = /import\s+([A-Za-z_$][\w$]*)\s+from\s+["'`]([^"'`]+)["'`]/g;

  let match;

  while ((match = requireRegex.exec(content)) !== null) {
    const targetPath = resolveLocalModulePath(filePath, match[2], availableFiles);
    if (targetPath) {
      aliases.set(match[1], targetPath);
    }
  }

  while ((match = importRegex.exec(content)) !== null) {
    const targetPath = resolveLocalModulePath(filePath, match[2], availableFiles);
    if (targetPath) {
      aliases.set(match[1], targetPath);
    }
  }

  return aliases;
}

function extractInvokedImportedFiles(content, importedAliases) {
  const invokedFiles = new Set();
  const memberCallRegex = /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g;
  let match;

  while ((match = memberCallRegex.exec(content)) !== null) {
    const alias = match[1];
    if (importedAliases.has(alias)) {
      invokedFiles.add(importedAliases.get(alias));
    }
  }

  return [...invokedFiles];
}

function findMatchingBraceIndex(content, openingBraceIndex) {
  let depth = 0;

  for (let index = openingBraceIndex; index < content.length; index += 1) {
    if (content[index] === "{") {
      depth += 1;
    }

    if (content[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractFunctionBodies(content) {
  const functionBodies = new Map();
  const patterns = [
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:asyncHandler\(\s*)?(?:async\s*)?\([^)]*\)\s*=>\s*\{/g,
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\([^)]*\)\s*\{/g,
    /async\s+function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g,
    /function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g
  ];

  patterns.forEach((pattern) => {
    let match;

    while ((match = pattern.exec(content)) !== null) {
      const functionName = match[1];
      const openingBraceIndex = content.indexOf("{", match.index);
      if (openingBraceIndex === -1) {
        continue;
      }

      const closingBraceIndex = findMatchingBraceIndex(content, openingBraceIndex);
      if (closingBraceIndex === -1) {
        continue;
      }

      functionBodies.set(functionName, content.slice(openingBraceIndex, closingBraceIndex + 1));
    }
  });

  return functionBodies;
}

function extractRouterVars(content) {
  const routerVars = new Set();
  const expressAppRegex = /const\s+([A-Za-z_$][\w$]*)\s*=\s*express\s*\(\s*\)/g;
  const expressRouterRegex = /const\s+([A-Za-z_$][\w$]*)\s*=\s*express\.Router\s*\(\s*\)/g;
  const routerFactoryRegex = /const\s+([A-Za-z_$][\w$]*)\s*=\s*Router\s*\(\s*\)/g;

  let match;

  while ((match = expressAppRegex.exec(content)) !== null) {
    routerVars.add(match[1]);
  }

  while ((match = expressRouterRegex.exec(content)) !== null) {
    routerVars.add(match[1]);
  }

  while ((match = routerFactoryRegex.exec(content)) !== null) {
    routerVars.add(match[1]);
  }

  return routerVars;
}

function extractExportedContexts(content, routerVars) {
  const exportedContexts = new Set();
  const commonJsRegex = /module\.exports\s*=\s*([A-Za-z_$][\w$]*)/g;
  const esModuleRegex = /export\s+default\s+([A-Za-z_$][\w$]*)/g;

  let match;

  while ((match = commonJsRegex.exec(content)) !== null) {
    if (routerVars.has(match[1])) {
      exportedContexts.add(match[1]);
    }
  }

  while ((match = esModuleRegex.exec(content)) !== null) {
    if (routerVars.has(match[1])) {
      exportedContexts.add(match[1]);
    }
  }

  if (exportedContexts.size === 0) {
    [...routerVars]
      .filter((routerVar) => routerVar !== "app")
      .forEach((routerVar) => exportedContexts.add(routerVar));
  }

  return exportedContexts;
}

function extractRouteDefinitions(content, filePath, routerVars, importedAliases) {
  const routeRegex =
    /\b([A-Za-z_$][\w$]*)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]([\s\S]*?)\)\s*;/g;
  const routes = [];
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    if (!routerVars.has(match[1])) {
      continue;
    }

    routes.push({
      context: match[1],
      method: match[2].toUpperCase(),
      path: normalizeRoutePath(match[3]),
      file: filePath,
      handlerFiles: extractRouteHandlerFiles(match[4] || "", importedAliases),
      handlerReferences: extractHandlerReferences(match[4] || "", importedAliases),
      handlerContent: match[4] || ""
    });
  }

  return routes;
}

function extractRouteHandlerFiles(handlerContent, importedAliases) {
  const handlerFiles = new Set();
  const memberRefRegex = /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\b/g;
  let match;

  while ((match = memberRefRegex.exec(handlerContent)) !== null) {
    const alias = match[1];
    if (importedAliases.has(alias)) {
      handlerFiles.add(importedAliases.get(alias));
    }
  }

  return [...handlerFiles];
}

function extractHandlerReferences(handlerContent, importedAliases) {
  const references = [];
  const memberRefRegex = /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\b/g;
  const directCallRegex = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  let match;

  while ((match = memberRefRegex.exec(handlerContent)) !== null) {
    if (importedAliases.has(match[1])) {
      references.push({
        filePath: importedAliases.get(match[1]),
        symbol: match[2]
      });
    }
  }

  while ((match = directCallRegex.exec(handlerContent)) !== null) {
    if (importedAliases.has(match[1])) {
      references.push({
        filePath: importedAliases.get(match[1]),
        symbol: null
      });
    }
  }

  return references;
}

function extractMountDefinitions(content, filePath, routerVars, importedAliases, availableFiles) {
  const mountRegex =
    /\b([A-Za-z_$][\w$]*)\.use\s*\(\s*(?:(["'`])([^"'`]+)\2\s*,\s*)?([A-Za-z_$][\w$]*|require\(\s*["'`][^"'`]+["'`]\s*\))/g;
  const mounts = [];
  let match;

  while ((match = mountRegex.exec(content)) !== null) {
    const context = match[1];
    if (!routerVars.has(context)) {
      continue;
    }

    const prefix = match[3] || "";
    const targetToken = match[4];

    if (routerVars.has(targetToken)) {
      mounts.push({
        context,
        prefix,
        targetType: "local",
        targetContext: targetToken
      });
      continue;
    }

    if (importedAliases.has(targetToken)) {
      mounts.push({
        context,
        prefix,
        targetType: "file",
        targetFile: importedAliases.get(targetToken)
      });
      continue;
    }

    const inlineRequireMatch = targetToken.match(/^require\(\s*["'`]([^"'`]+)["'`]\s*\)$/);
    if (!inlineRequireMatch) {
      continue;
    }

    const resolvedTarget = resolveLocalModulePath(filePath, inlineRequireMatch[1], availableFiles);
    if (resolvedTarget) {
      mounts.push({
        context,
        prefix,
        targetType: "file",
        targetFile: resolvedTarget
      });
    }
  }

  return mounts;
}

function buildNodeRouteGraph(files) {
  const analyzableFiles = files.filter((file) => isAnalyzableSourceFile(normalizeFilePath(file.path)));
  const availableFiles = new Set(analyzableFiles.map((file) => normalizeFilePath(file.path)));
  const analysisByFile = new Map();

  analyzableFiles.forEach((file) => {
    const filePath = normalizeFilePath(file.path);
    const content = file.content;
    const routerVars = extractRouterVars(content);
    const importedAliases = extractImportedAliases(content, filePath, availableFiles);
    const routeDefinitions = extractRouteDefinitions(content, filePath, routerVars, importedAliases);
    const mountDefinitions = extractMountDefinitions(content, filePath, routerVars, importedAliases, availableFiles);
    const exportedContexts = extractExportedContexts(content, routerVars);
    const invokedImportedFiles = extractInvokedImportedFiles(content, importedAliases);
    const functionBodies = extractFunctionBodies(content);

    analysisByFile.set(filePath, {
      filePath,
      routerVars,
      importedAliases,
      routeDefinitions,
      mountDefinitions,
      exportedContexts,
      invokedImportedFiles,
      functionBodies
    });
  });

  return analysisByFile;
}

function collectNodeRoutes(routeGraph) {
  const roots = [...routeGraph.values()]
    .filter((entry) => entry.routerVars.has("app") && (entry.routeDefinitions.length > 0 || entry.mountDefinitions.length > 0))
    .flatMap((entry) => [...entry.routerVars].filter((routerVar) => routerVar === "app").map((context) => ({
      filePath: entry.filePath,
      context,
      prefix: ""
    })));

  const fallbackRoots =
    roots.length > 0
      ? roots
      : [...routeGraph.values()]
          .filter((entry) => entry.routeDefinitions.length > 0 || entry.mountDefinitions.length > 0)
          .flatMap((entry) => [...entry.exportedContexts].map((context) => ({
            filePath: entry.filePath,
            context,
            prefix: ""
          })));

  const visited = new Set();

  function walk(filePath, context, prefix) {
    const visitKey = `${filePath}:${context}:${prefix}`;
    if (visited.has(visitKey)) {
      return [];
    }

    visited.add(visitKey);
    const entry = routeGraph.get(filePath);
    if (!entry) {
      return [];
    }

    const localRoutes = entry.routeDefinitions
      .filter((route) => route.context === context)
      .map((route) => ({
        method: route.method,
        path: normalizeRoutePath(prefix, route.path),
        file: route.file,
        handlerFiles: route.handlerFiles || [],
        handlerReferences: route.handlerReferences || [],
        handlerContent: route.handlerContent || ""
      }));

    const childRoutes = entry.mountDefinitions
      .filter((mount) => mount.context === context)
      .flatMap((mount) => {
        const mountedPrefix = normalizeRoutePath(prefix, mount.prefix);

        if (mount.targetType === "local") {
          return walk(filePath, mount.targetContext, mountedPrefix);
        }

        const childEntry = routeGraph.get(mount.targetFile);
        if (!childEntry) {
          return [];
        }

        return [...childEntry.exportedContexts].flatMap((childContext) =>
          walk(childEntry.filePath, childContext, mountedPrefix)
        );
      });

    return [...localRoutes, ...childRoutes];
  }

  return fallbackRoots.flatMap((root) => walk(root.filePath, root.context, root.prefix));
}

function collectRelatedFiles(routeGraph, entryFiles, maxDepth = 3) {
  const visited = new Set();

  function walk(filePath, depth) {
    if (!filePath || visited.has(filePath) || depth > maxDepth) {
      return;
    }

    visited.add(filePath);
    const entry = routeGraph.get(filePath);
    if (!entry) {
      return;
    }

    entry.invokedImportedFiles.forEach((childFile) => walk(childFile, depth + 1));
  }

  entryFiles.forEach((filePath) => walk(filePath, 0));
  return [...visited];
}

function countOperationsInSnippet(snippet, regex) {
  if (!snippet) {
    return 0;
  }

  return (snippet.match(regex) || []).length;
}

function countDbOperationsInSnippet(snippet) {
  return countOperationsInSnippet(snippet, new RegExp(`\\.\\s*(${QUERY_METHODS.join("|")})\\s*\\(`, "g"));
}

function countBlockingOperationsInSnippet(snippet) {
  return SYNC_PATTERNS.reduce(
    (total, pattern) => total + countOperationsInSnippet(snippet, new RegExp(pattern, "g")),
    0
  );
}

function collectTransitiveRouteMetrics(routeGraph, handlerReferences, visited = new Set()) {
  return (handlerReferences || []).reduce(
    (totals, reference) => {
      const visitKey = `${reference.filePath}:${reference.symbol || "default"}`;
      if (!reference.filePath || visited.has(visitKey)) {
        return totals;
      }

      visited.add(visitKey);
      const entry = routeGraph.get(reference.filePath);
      if (!entry) {
        return totals;
      }

      const snippet =
        (reference.symbol && entry.functionBodies.get(reference.symbol)) ||
        (!reference.symbol && entry.functionBodies.size === 1 ? [...entry.functionBodies.values()][0] : "");

      if (!snippet) {
        return totals;
      }

      const nestedReferences = extractHandlerReferences(snippet, entry.importedAliases);
      const nestedTotals = collectTransitiveRouteMetrics(routeGraph, nestedReferences, visited);

      return {
        dbCallCount: totals.dbCallCount + countDbOperationsInSnippet(snippet) + nestedTotals.dbCallCount,
        bottleneckCount:
          totals.bottleneckCount + countBlockingOperationsInSnippet(snippet) + nestedTotals.bottleneckCount
      };
    },
    {
      dbCallCount: 0,
      bottleneckCount: 0
    }
  );
}

function countNodeDatabaseInteractions(content, lowerFile) {
  if (/(^|\/)(models?|config)\//.test(lowerFile)) {
    return [];
  }

  const hasDatabaseContext =
    /require\(\s*["'`].*models\/.+["'`]\s*\)/.test(content) ||
    /\bmongoose\b|\bsequelize\b|\bprisma\b|\bmongodb\b|\bknex\b/i.test(content) ||
    /(^|\/)(repositories?)\//.test(lowerFile);

  if (!hasDatabaseContext) {
    return [];
  }

  const executableContent = content
    .split("\n")
    .filter((line) => !/^\s*(const|let|var)\s+.*=\s*require\(/.test(line))
    .filter((line) => !/^\s*import\s+/.test(line))
    .join("\n");

  const queryRegex = new RegExp(`\\.\\s*(${QUERY_METHODS.join("|")})\\s*\\(`, "g");
  const matches = [];
  let match;

  while ((match = queryRegex.exec(executableContent)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

function analyzeNodeRepository(files) {
  const services = [];
  const dependencies = [];
  const databaseInteractions = [];
  const middleware = [];
  const blockingPatterns = [];
  const authSignals = [];
  const validationSignals = [];
  const cachingSignals = [];
  const rateLimitSignals = [];
  const asyncMessagingSignals = [];
  const errorHandlingSignals = [];
  const monitoringSignals = [];
  const statefulSignals = [];
  const externalCallSignals = [];
  const resilienceSignals = [];
  const asyncWrapperSignals = [];
  const healthEndpointSignals = [];
  let tryCatchCount = 0;

  const analyzableFiles = files.filter((file) => isAnalyzableSourceFile(normalizeFilePath(file.path)));
  const routeGraph = buildNodeRouteGraph(analyzableFiles);
  const apis = collectNodeRoutes(routeGraph).filter((api, index, allApis) => {
    const key = `${api.method}:${api.path}:${api.file}`;
    return allApis.findIndex((candidate) => `${candidate.method}:${candidate.path}:${candidate.file}` === key) === index;
  });
  const routeTraces = apis.map((api) => {
    const transitiveMetrics = collectTransitiveRouteMetrics(routeGraph, api.handlerReferences || []);

    return {
      method: api.method,
      path: api.path,
      file: api.file,
      relatedFiles: collectRelatedFiles(routeGraph, [api.file, ...(api.handlerFiles || [])]),
      dbCallCount: countDbOperationsInSnippet(api.handlerContent) + transitiveMetrics.dbCallCount,
      bottleneckCount: countBlockingOperationsInSnippet(api.handlerContent) + transitiveMetrics.bottleneckCount
    };
  });

  analyzableFiles.forEach((file) => {
    const relativeFile = normalizeFilePath(file.path);
    const content = file.content;
    const lowerFile = relativeFile.toLowerCase();

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

    detectDependencies(content).forEach((dependency) => {
      dependencies.push({
        from: relativeFile,
        to: dependency
      });
    });

    countNodeDatabaseInteractions(content, lowerFile).forEach((operation, index) => {
      databaseInteractions.push({
        file: relativeFile,
        type: "query-operation",
        operation,
        locationIndex: index
      });
    });

    if (/\bexpress-rate-limit\b|\brateLimit\s*\(|\bslowDown\s*\(|\bthrottle\b/i.test(content)) {
      rateLimitSignals.push(relativeFile);
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

    const syncPatterns = ["readFileSync", "writeFileSync", "appendFileSync", "execSync", "spawnSync"];
    syncPatterns.forEach((pattern) => {
      const matches = content.match(new RegExp(pattern, "g")) || [];
      matches.forEach((_, index) => {
        blockingPatterns.push({
          file: relativeFile,
          pattern,
          locationIndex: index
        });
      });
    });
  });

  debugDetectedRoutes("Node.js", apis);

  return {
    services,
    repositories: [],
    apis,
    routeTraces,
    dependencies,
    databaseInteractions,
    middleware,
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
    tryCatchCount
  };
}

module.exports = {
  analyzeNodeRepository,
  getDetectedRoutes
};
