const path = require("path");

function getBackendRoot() {
  return path.resolve(__dirname, "../..");
}

function resolveFromBackend(...segments) {
  return path.join(getBackendRoot(), ...segments);
}

module.exports = {
  getBackendRoot,
  resolveFromBackend
};
