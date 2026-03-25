const fs = require("fs");
const path = require("path");

const { test, expect, request } = require("@playwright/test");
const { createZipFromFixture } = require("../../backend/tests/helpers/fixture.utils");

const API_BASE_URL = "http://127.0.0.1:5004";
const SAMPLE_FIXTURE_ROOT = path.resolve(__dirname, "../../backend/tests/fixtures/sample-repo");

let projectId;
let zipPath;

test.beforeAll(async () => {
  zipPath = createZipFromFixture(SAMPLE_FIXTURE_ROOT);
  const apiContext = await request.newContext({
    baseURL: API_BASE_URL
  });

  const response = await apiContext.post("/analyze-repo", {
    multipart: {
      zipFile: {
        name: "sample-project.zip",
        mimeType: "application/zip",
        buffer: fs.readFileSync(zipPath)
      }
    }
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  projectId = body.projectId;

  await apiContext.dispose();
});

test.afterAll(async () => {
  if (zipPath && fs.existsSync(zipPath)) {
    fs.rmSync(zipPath, { force: true });
  }
});

test("loads the dashboard and renders backend insights", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /backend intelligence dashboard/i })).toBeVisible();

  const projectIdInput = page.getByTestId("project-id-input");
  const loadButton = page.getByTestId("load-dashboard-button");

  await projectIdInput.fill(projectId);
  await loadButton.click();

  await expect(page.getByTestId("dashboard-error")).toHaveCount(0);
  await expect(page.getByTestId("analysis-score")).toContainText(/\d+/);
  await expect(page.getByTestId("analysis-summary")).not.toBeEmpty();
  await expect(page.getByTestId("top-issue-item").first()).toBeVisible();
  await expect(page.getByTestId("car-component-engine")).toBeVisible();
  await expect(page.getByTestId("car-component-security")).toBeVisible();
});
