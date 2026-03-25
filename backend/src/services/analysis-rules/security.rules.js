const {
  createRule,
  buildIssue,
  buildFailedRule,
  buildPassedRule,
  formatRatio,
  getFilesMatching
} = require("./helpers");

module.exports = [
  createRule({
    name: "missing-auth",
    category: "security",
    weight: 25,
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0 || scanResult.authSignals.length > 0) {
        return buildPassedRule("Authentication signals are present or no APIs were detected.");
      }

      const routeCount = scanResult.apis.length;
      return buildFailedRule({
        weight: 25,
        message: `Authentication signals are missing on ${routeCount} out of ${routeCount} routes (${formatRatio(routeCount, routeCount)}).`,
        issues: [buildIssue({
          category: "security",
          severity: "high",
          title: "Authentication middleware is not detected",
          description: "API routes were found, but no authentication middleware, guards, or auth service signals were detected.",
          recommendation: "Add auth middleware or gateway protection for sensitive endpoints.",
          ruleId: "security.missing-auth"
        })]
      });
    }
  }),
  createRule({
    name: "missing-validation",
    category: "security",
    weight: 15,
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0 || scanResult.validationSignals.length > 0) {
        return buildPassedRule("Validation signals are present or no APIs were detected.");
      }

      const routeCount = scanResult.apis.length;
      return buildFailedRule({
        weight: 15,
        message: `Validation is missing on ${routeCount} out of ${routeCount} routes (${formatRatio(routeCount, routeCount)}).`,
        issues: [buildIssue({
          category: "security",
          severity: "medium",
          title: "Input validation appears to be missing",
          description: "Routes were found but no Joi, Zod, express-validator, or similar validation patterns were detected.",
          recommendation: "Validate request payloads and params close to the route layer.",
          ruleId: "security.missing-validation"
        })]
      });
    }
  }),
  createRule({
    name: "missing-rate-limiting",
    category: "security",
    weight: 12,
    evaluate: (scanResult) => {
      const mutableApis = scanResult.apis.filter((api) => ["POST", "PUT", "PATCH", "DELETE"].includes(api.method));
      const publicSurface = scanResult.apis.length;

      if (publicSurface === 0 || scanResult.rateLimitSignals.length > 0) {
        return buildPassedRule("Rate limiting signals are present or the API surface is minimal.");
      }

      if (publicSurface < 3 && mutableApis.length <= 1) {
        return buildPassedRule("The API surface is still small enough that missing rate limiting is less urgent.");
      }

      return buildFailedRule({
        weight: 12,
        message: `No rate limiting was detected across ${publicSurface} routes, including ${mutableApis.length} mutable route(s).`,
        issues: [buildIssue({
          category: "security",
          severity: "medium",
          title: "Rate limiting does not appear to be configured",
          description: `No rate limiting signals were found across ${publicSurface} routes, including ${mutableApis.length} mutable route(s).`,
          recommendation: "Add request throttling or per-client rate limits on public-facing APIs.",
          ruleId: "security.missing-rate-limiting"
        })]
      });
    }
  }),
  createRule({
    name: "public-mutable-routes",
    category: "security",
    weight: 25,
    evaluate: (scanResult) => {
      const mutableApis = scanResult.apis.filter((api) => ["POST", "PUT", "PATCH", "DELETE"].includes(api.method));

      if (mutableApis.length === 0 || scanResult.authSignals.length > 0) {
        return buildPassedRule("Write routes are protected or no mutable APIs were detected.");
      }

      return buildFailedRule({
        weight: 25,
        message: `${mutableApis.length} out of ${mutableApis.length} mutable routes (${formatRatio(mutableApis.length, mutableApis.length)}) may be publicly reachable without auth signals.`,
        issues: [buildIssue({
          category: "security",
          severity: "high",
          title: "Write APIs may be publicly reachable",
          description: `${mutableApis.length} mutable API route(s) were found without matching auth-related signals in the codebase.`,
          file: mutableApis[0].file,
          recommendation: "Protect write endpoints with authentication and authorization middleware.",
          ruleId: "security.public-mutable-routes"
        })]
      });
    }
  }),
  createRule({
    name: "secret-leak-risk",
    category: "security",
    weight: 15,
    evaluate: (scanResult) => {
      const matches = getFilesMatching(scanResult, [
        /api[_-]?key\s*[:=]\s*["'`].+["'`]/i,
        /secret\s*[:=]\s*["'`].+["'`]/i,
        /password\s*[:=]\s*["'`].+["'`]/i
      ]);

      if (matches.length === 0) {
        return buildPassedRule("No hardcoded secret patterns were detected.");
      }

      return buildFailedRule({
        weight: 15,
        message: "Files contain string assignments that resemble secrets or credentials.",
        issues: [buildIssue({
          category: "security",
          severity: "medium",
          title: "Potential hardcoded secret usage detected",
          description: "Files contain string assignments that resemble secrets or credentials.",
          file: matches[0],
          recommendation: "Move sensitive values into environment variables or a secrets manager.",
          ruleId: "security.secret-leak-risk"
        })]
      });
    }
  }),
  createRule({
    name: "auth-without-validation",
    category: "security",
    weight: 8,
    evaluate: (scanResult) => {
      if (scanResult.authSignals.length === 0 || scanResult.validationSignals.length > 0 || scanResult.apis.length === 0) {
        return buildPassedRule("Auth and validation coverage look reasonably aligned.");
      }

      return buildFailedRule({
        weight: 8,
        message: `${scanResult.authSignals.length} auth-related file(s) were found, but validation coverage is still 0%.`,
        issues: [buildIssue({
          category: "security",
          severity: "low",
          title: "Validation coverage looks thin relative to auth coverage",
          description: `Auth-related files were found (${scanResult.authSignals.length}), but explicit validation tooling was not detected.`,
          recommendation: "Add schema validation to reduce malformed or malicious payload handling risk.",
          ruleId: "security.auth-without-validation"
        })]
      });
    }
  })
];
