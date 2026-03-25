function extractAnnotationPath(content, annotationName) {
  const match = content.match(new RegExp(`@${annotationName}\\s*\\(([^)]*)\\)`, "m"));
  if (!match) {
    return "";
  }

  const params = match[1];
  const valueMatch = params.match(/(?:value|path)\s*=\s*"([^"]+)"/);
  if (valueMatch) {
    return valueMatch[1];
  }

  const shortMatch = params.match(/"([^"]+)"/);
  return shortMatch ? shortMatch[1] : "";
}

function joinRouteSegments(basePath, methodPath) {
  const base = basePath || "";
  const route = methodPath || "";
  const joined = `${base}/${route}`.replace(/\/+/g, "/");
  const normalized = joined.startsWith("/") ? joined : `/${joined}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function detectJavaApis(content, file) {
  const apis = [];
  const basePath = extractAnnotationPath(content, "RequestMapping");
  const mappingPatterns = [
    { annotation: "GetMapping", method: "GET" },
    { annotation: "PostMapping", method: "POST" },
    { annotation: "PutMapping", method: "PUT" },
    { annotation: "PatchMapping", method: "PATCH" },
    { annotation: "DeleteMapping", method: "DELETE" }
  ];

  mappingPatterns.forEach(({ annotation, method }) => {
    const regex = new RegExp(`@${annotation}\\s*(\\(([^)]*)\\))?`, "g");
    let match;

    while ((match = regex.exec(content)) !== null) {
      const params = match[2] || "";
      const routeMatch = params.match(/(?:value|path)\s*=\s*"([^"]+)"/) || params.match(/"([^"]+)"/);
      const routePath = routeMatch ? routeMatch[1] : "";

      apis.push({
        method,
        path: joinRouteSegments(basePath, routePath),
        file
      });
    }
  });

  return apis;
}

function detectSpringDependencies(content, file) {
  const dependencyRegex = /\bimport\s+([\w.]+);/g;
  const dependencies = [];
  let match;

  while ((match = dependencyRegex.exec(content)) !== null) {
    dependencies.push({
      from: file,
      to: match[1]
    });
  }

  return dependencies;
}

function analyzeJavaRepository(files) {
  const javaFiles = files.filter((file) => file.path.toLowerCase().endsWith(".java"));
  const gradleOrMavenFiles = files.filter((file) => /(pom\.xml|build\.gradle)$/i.test(file.path));

  const services = [];
  const repositories = [];
  const apis = [];
  const dependencies = [];
  const databaseInteractions = [];
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
  const blockingPatterns = [];
  let tryCatchCount = 0;

  [...javaFiles, ...gradleOrMavenFiles].forEach((file) => {
    const content = file.content;
    const lowerPath = file.path.toLowerCase();

    if (/@RestController\b|@Controller\b/.test(content)) {
      apis.push(...detectJavaApis(content, file.path));
    }

    if (/@Service\b/.test(content) || lowerPath.includes("/service")) {
      services.push({
        name: file.path.split("/").pop().replace(/\.java$/i, ""),
        file: file.path
      });
    }

    if (/@Repository\b|JpaRepository\b|CrudRepository\b/.test(content) || lowerPath.includes("/repository")) {
      repositories.push({
        name: file.path.split("/").pop().replace(/\.java$/i, ""),
        file: file.path
      });
      databaseInteractions.push({
        file: file.path,
        type: "repository"
      });
    }

    dependencies.push(...detectSpringDependencies(content, file.path));

    const dbMatches =
      content.match(/\b(findAll|findById|save|deleteById|count|EntityManager|JdbcTemplate|JpaRepository|CrudRepository)\b/g) || [];
    dbMatches.forEach(() => {
      databaseInteractions.push({
        file: file.path,
        type: "query-operation"
      });
    });

    if (/@Valid\b|@Validated\b|jakarta\.validation|javax\.validation/.test(content)) {
      validationSignals.push(file.path);
    }

    if (/@EnableWebSecurity\b|SecurityFilterChain\b|WebSecurityConfigurerAdapter\b|HttpSecurity\b|PreAuthorize\b|Secured\b/.test(content)) {
      authSignals.push(file.path);
    }

    if (/@ControllerAdvice\b|@RestControllerAdvice\b|@ExceptionHandler\b/.test(content)) {
      errorHandlingSignals.push(file.path);
    }

    if (/@EnableCaching\b|CacheManager\b|@Cacheable\b|@CacheEvict\b/.test(content)) {
      cachingSignals.push(file.path);
    }

    if (/\bRateLimiter\b|Bucket4j|resilience4j-ratelimiter|io\.github\.bucket4j|com\.google\.common\.util\.concurrent\.RateLimiter|HandlerInterceptor/.test(content)) {
      rateLimitSignals.push(file.path);
    }

    if (/\b@Async\b|RabbitTemplate\b|KafkaTemplate\b|JmsTemplate\b/.test(content)) {
      asyncMessagingSignals.push(file.path);
    }

    if (/\bRetryTemplate\b|@Retryable\b|resilience4j\b|CircuitBreaker\b|TimeLimiter\b|ReadTimeoutHandler\b|connectTimeout\b|readTimeout\b|responseTimeout\b|options\(\)\.readTimeout\b|setReadTimeout\b|setConnectTimeout\b/.test(content)) {
      resilienceSignals.push(file.path);
    }

    if (/\bRestTemplate\b|WebClient\b|FeignClient\b|HttpClient\b|OpenFeign\b/.test(content)) {
      externalCallSignals.push(file.path);
    }

    if (/\bSlf4j\b|LoggerFactory\b|MeterRegistry\b|SpringBootActuator\b|HealthIndicator\b|HealthEndpoint\b|management\.endpoint\.health\b/.test(content)) {
      monitoringSignals.push(file.path);
    }

    if (/\bConcurrentHashMap\b|\bHashMap<\b|\bstatic\s+\w+\s+\w+\s*=/.test(content)) {
      statefulSignals.push(file.path);
    }

    if (/@ExceptionHandler\b|CompletableFuture\b/.test(content)) {
      asyncWrapperSignals.push(file.path);
    }

    if (/\/health|\/actuator\/health|HealthIndicator\b|HealthEndpoint\b|management\.endpoint\.health\b/.test(content)) {
      healthEndpointSignals.push(file.path);
    }

    if (/\btry\s*\{/.test(content)) {
      tryCatchCount += (content.match(/\btry\s*\{/g) || []).length;
    }

    const syncPatterns = ["Thread.sleep", "Files.readAllBytes", "Files.readString"];
    syncPatterns.forEach((pattern) => {
      if (content.includes(pattern)) {
        blockingPatterns.push({
          file: file.path,
          pattern
        });
      }
    });
  });

  return {
    services,
    repositories,
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
    tryCatchCount
  };
}

module.exports = {
  analyzeJavaRepository
};
