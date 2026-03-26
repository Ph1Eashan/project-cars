function getDetectedRoutes(apis = []) {
  const routes = [
    ...new Set(
      (Array.isArray(apis) ? apis : [])
        .map((api) => (api?.method && api?.path ? `${api.method} ${api.path}` : null))
        .filter(Boolean)
    )
  ];
  return {
    routes,
    count: routes.length
  };
}

function debugDetectedRoutes(analyzerName, apis = []) {
  if (process.env.DEBUG_ANALYZER !== "true") {
    return;
  }

  const { routes, count } = getDetectedRoutes(apis);
  const routeList = routes.length > 0 ? routes.join(", ") : "none";
  console.info(`[${analyzerName} analyzer] detected routes (${count}): ${routeList}`);
}

module.exports = {
  debugDetectedRoutes,
  getDetectedRoutes
};
