import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

function sanitizePath(pathValue = "") {
  return pathValue
    .split(":")
    .filter((entry) => entry && !entry.includes("/.console-ninja/"))
    .join(":");
}

const require = createRequire(import.meta.url);
const vitePackageJson = require.resolve("vite/package.json");
const viteBin = path.join(path.dirname(vitePackageJson), "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: sanitizePath(process.env.PATH)
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
