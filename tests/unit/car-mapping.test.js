const { mapRulesToCarState } = require("../../src/services/car-mapping.service");

describe("car mapping service", () => {
  test("maps failed rules to configurable car component states", () => {
    const result = mapRulesToCarState([
      {
        ruleId: "performance.blocking-operations",
        name: "blocking-operations",
        passed: false,
        impact: 15,
        message: "Synchronous operations were found in code that may impact request latency."
      },
      {
        ruleId: "performance.chatty-database",
        name: "chatty-database",
        passed: true,
        impact: 0,
        message: "Database interaction density looks manageable."
      },
      {
        ruleId: "security.missing-auth",
        name: "missing-auth",
        passed: false,
        impact: 25,
        message: "API routes were found, but no authentication middleware or auth guard signals were detected."
      }
    ]);

    expect(result).toEqual({
      car: {
        engine: {
          status: "weak",
          reasons: [
            {
              rule: "blocking-operations",
              message: "Synchronous operations were found in code that may impact request latency."
            }
          ]
        },
        turbo: {
          status: "missing",
          reasons: []
        },
        brakes: {
          status: "missing",
          reasons: []
        },
        transmission: {
          status: "missing",
          reasons: []
        },
        suspension: {
          status: "missing",
          reasons: []
        },
        security: {
          status: "broken",
          reasons: [
            {
              rule: "missing-auth",
              message: "API routes were found, but no authentication middleware or auth guard signals were detected."
            }
          ]
        }
      }
    });
  });

  test("marks components healthy when mapped rules are present and passing", () => {
    const result = mapRulesToCarState([
      {
        ruleId: "reliability.missing-central-error-handler",
        name: "missing-central-error-handler",
        passed: true,
        impact: 0,
        message: "Global error handling signals are present or no APIs were detected."
      },
      {
        ruleId: "reliability.sparse-defensive-handling",
        name: "sparse-defensive-handling",
        passed: true,
        impact: 0,
        message: "Defensive error handling coverage looks acceptable."
      }
    ]);

    expect(result.car.brakes).toEqual({
      status: "healthy",
      reasons: []
    });
  });
});
