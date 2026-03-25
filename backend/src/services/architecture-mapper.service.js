function buildArchitectureGraph(scanResult) {
  return {
    services: scanResult.services,
    apis: scanResult.apis,
    dependencies: scanResult.dependencies,
    databaseInteractions: scanResult.databaseInteractions,
    fileTree: scanResult.fileTree,
    summary: {
      totalFiles: scanResult.totalFiles,
      totalDirectories: scanResult.totalDirectories,
      middlewareCount: scanResult.middleware.length
    }
  };
}

module.exports = {
  buildArchitectureGraph
};
