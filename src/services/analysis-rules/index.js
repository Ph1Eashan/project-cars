const securityRules = require("./security.rules");
const performanceRules = require("./performance.rules");
const scalabilityRules = require("./scalability.rules");
const reliabilityRules = require("./reliability.rules");

const CATEGORY_CONFIG = {
  security: {
    weight: 1,
    rules: securityRules
  },
  performance: {
    weight: 1,
    rules: performanceRules
  },
  scalability: {
    weight: 1,
    rules: scalabilityRules
  },
  reliability: {
    weight: 1,
    rules: reliabilityRules
  }
};

function listActiveRules() {
  return Object.fromEntries(
    Object.entries(CATEGORY_CONFIG).map(([category, config]) => [
      category,
      config.rules.map((rule) => ({
        name: rule.name,
        category: rule.category,
        weight: rule.weight
      }))
    ])
  );
}

module.exports = {
  CATEGORY_CONFIG,
  CATEGORY_NAMES: Object.keys(CATEGORY_CONFIG),
  listActiveRules
};
