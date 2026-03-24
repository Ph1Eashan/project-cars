const { createRule, buildIssue, getFilesMatching } = require("./helpers");

module.exports = [
  createRule({
    id: "security.missing-auth",
    title: "Authentication middleware is not detected",
    description: "APIs exist but route protection signals are missing.",
    severity: "high",
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0 || scanResult.authSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "security",
          severity: "high",
          title: "Authentication middleware is not detected",
          description: "API routes were found, but no authentication middleware, guards, or auth service signals were detected.",
          recommendation: "Add auth middleware or gateway protection for sensitive endpoints.",
          ruleId: "security.missing-auth"
        })
      };
    }
  }),
  createRule({
    id: "security.missing-validation",
    title: "Request validation appears limited",
    description: "Routes should validate payloads at the boundary.",
    severity: "medium",
    evaluate: (scanResult) => {
      if (scanResult.apis.length === 0 || scanResult.validationSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "security",
          severity: "medium",
          title: "Input validation appears to be missing",
          description: "Routes were found but no Joi, Zod, express-validator, or similar validation patterns were detected.",
          recommendation: "Validate request payloads and params close to the route layer.",
          ruleId: "security.missing-validation"
        })
      };
    }
  }),
  createRule({
    id: "security.public-mutable-routes",
    title: "Mutable routes lack visible protection",
    description: "Write endpoints deserve stronger checks than read endpoints.",
    severity: "high",
    evaluate: (scanResult) => {
      const mutableApis = scanResult.apis.filter((api) => ["POST", "PUT", "PATCH", "DELETE"].includes(api.method));

      if (mutableApis.length === 0 || scanResult.authSignals.length > 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "security",
          severity: "high",
          title: "Write APIs may be publicly reachable",
          description: `${mutableApis.length} mutable API route(s) were found without matching auth-related signals in the codebase.`,
          file: mutableApis[0].file,
          recommendation: "Protect write endpoints with authentication and authorization middleware.",
          ruleId: "security.public-mutable-routes"
        })
      };
    }
  }),
  createRule({
    id: "security.secret-leak-risk",
    title: "Potential hardcoded secret usage detected",
    description: "Configuration secrets should come from environment variables.",
    severity: "medium",
    evaluate: (scanResult) => {
      const matches = getFilesMatching(scanResult, [
        /api[_-]?key\s*[:=]\s*["'`].+["'`]/i,
        /secret\s*[:=]\s*["'`].+["'`]/i,
        /password\s*[:=]\s*["'`].+["'`]/i
      ]);

      if (matches.length === 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "security",
          severity: "medium",
          title: "Potential hardcoded secret usage detected",
          description: "Files contain string assignments that resemble secrets or credentials.",
          file: matches[0],
          recommendation: "Move sensitive values into environment variables or a secrets manager.",
          ruleId: "security.secret-leak-risk"
        })
      };
    }
  }),
  createRule({
    id: "security.auth-without-validation",
    title: "Auth exists but validation coverage looks thin",
    description: "Protected routes still need schema validation.",
    severity: "low",
    evaluate: (scanResult) => {
      if (scanResult.authSignals.length === 0 || scanResult.validationSignals.length > 0 || scanResult.apis.length === 0) {
        return null;
      }

      return {
        issue: buildIssue({
          category: "security",
          severity: "low",
          title: "Validation coverage looks thin relative to auth coverage",
          description: `Auth-related files were found (${scanResult.authSignals.length}), but explicit validation tooling was not detected.`,
          recommendation: "Add schema validation to reduce malformed or malicious payload handling risk.",
          ruleId: "security.auth-without-validation"
        })
      };
    }
  })
];
