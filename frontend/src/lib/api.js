const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

async function requestJson(path, options = {}) {
  const response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchDashboardData(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const [analysis, carView, rules] = await Promise.all([
    requestJson(`/analysis/${projectId}`),
    requestJson(`/car-view/${projectId}`),
    requestJson("/rules")
  ]);

  return {
    analysis,
    carView,
    rules
  };
}

export async function analyzeRepository(repoUrl) {
  if (!repoUrl) {
    throw new Error("Repository URL is required");
  }

  return requestJson("/analyze-repo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ repoUrl })
  });
}

export { DEFAULT_API_BASE_URL };
