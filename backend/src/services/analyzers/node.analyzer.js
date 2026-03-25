const path = require("path");

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

function analyzeNodeRepository(files) {
  const services = [];
  const apis = [];
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

  files.forEach((file) => {
    const relativeFile = file.path;
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

    const queryMatches =
      content.match(/\b(findOne|findById|find|aggregate|insertOne|insertMany|create|updateOne|updateMany|save|deleteOne|deleteMany|countDocuments)\b/g) || [];
    queryMatches.forEach(() => {
      databaseInteractions.push({
        file: relativeFile,
        type: "query-operation"
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
      if (content.includes(pattern)) {
        blockingPatterns.push({
          file: relativeFile,
          pattern
        });
      }
    });
  });

  return {
    services,
    repositories: [],
    apis,
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
  analyzeNodeRepository
};
