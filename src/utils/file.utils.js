const fs = require("fs");
const path = require("path");

function ensureDirectoryExists(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(fullPath, { recursive: true });
}

function removePathIfExists(targetPath) {
  if (targetPath && fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function readFilesRecursively(rootPath, ignoredDirectories = new Set()) {
  const collected = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    entries.forEach((entry) => {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          walk(fullPath);
        }
        return;
      }

      if (/\.(js|cjs|mjs|ts|json)$/i.test(entry.name)) {
        collected.push(fullPath);
      }
    });
  }

  walk(rootPath);
  return collected;
}

function createFileTree(rootPath, ignoredDirectories = new Set()) {
  function buildTree(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    return entries
      .filter((entry) => !ignoredDirectories.has(entry.name))
      .map((entry) => {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            type: "directory",
            children: buildTree(fullPath)
          };
        }

        return {
          name: entry.name,
          type: "file"
        };
      });
  }

  return buildTree(rootPath);
}

module.exports = {
  ensureDirectoryExists,
  removePathIfExists,
  readFilesRecursively,
  createFileTree
};
