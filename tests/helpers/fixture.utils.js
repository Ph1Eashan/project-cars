const fs = require("fs");
const os = require("os");
const path = require("path");
const AdmZip = require("adm-zip");

function createZipFromFixture(fixtureDirectory) {
  const archive = new AdmZip();

  function addDirectory(currentPath, relativePath = "") {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    entries.forEach((entry) => {
      const entryPath = path.join(currentPath, entry.name);
      const archivePath = path.posix.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        addDirectory(entryPath, archivePath);
        return;
      }

      archive.addLocalFile(entryPath, path.posix.dirname(archivePath) === "." ? "" : path.posix.dirname(archivePath));
    });
  }

  addDirectory(fixtureDirectory);

  const zipPath = path.join(os.tmpdir(), `project-cars-fixture-${Date.now()}.zip`);
  archive.writeZip(zipPath);
  return zipPath;
}

module.exports = {
  createZipFromFixture
};
