import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status || 1);
  }
}

const jsFiles = [
  "scripts/base.js",
  "scripts/i18n.js",
  "scripts/layout.js",
  "scripts/placeholders.js",
  "scripts/daily_jokes.js",
  "scripts/script_registry.js",
  "scripts/script_leather.js",
  "scripts/leather_worker.js",
  "scripts/indexes.js",
  "sw.js",
];

const cssFiles = ["styles/style.css", "styles/style-leather.css"];

for (const file of jsFiles) {
  const input = path.join(root, file);
  if (!fs.existsSync(input)) continue;
  run("npx", ["--yes", "terser", input, "-c", "-m", "-o", input]);
  console.log("minified", file);
}

for (const file of cssFiles) {
  const input = path.join(root, file);
  if (!fs.existsSync(input)) continue;
  run("npx", ["--yes", "csso-cli", input, "--output", input]);
  console.log("minified", file);
}
