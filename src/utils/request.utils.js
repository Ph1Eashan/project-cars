const crypto = require("crypto");

function createRequestId() {
  return crypto.randomUUID();
}

module.exports = {
  createRequestId
};
