import { readFile, writeFile } from "node:fs/promises";

const TARGETS = [
  { path: "package.json", pattern: /^(\s*"version":\s*")[^"]*(")/m },
  { path: "src-tauri/tauri.conf.json", pattern: /^(\s*"version":\s*")[^"]*(")/m },
  { path: "src-tauri/Cargo.toml", pattern: /^(version = ")[^"]*(")/m },
];

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const checkOnly = args.includes("--check");
const raw = args.find((arg) => !arg.startsWith("--"));

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

async function readVersion(path, pattern) {
  const text = await readFile(path, "utf8");
  const match = pattern.exec(text);
  if (!match) fail(`cannot find version in ${path}`);
  const start = match.index + match[1].length;
  const end = match.index + match[0].length - match[2].length;
  return { text, version: text.slice(start, end) };
}

const current = await Promise.all(TARGETS.map((t) => readVersion(t.path, t.pattern)));
const versions = new Set(current.map((c) => c.version));

if (checkOnly) {
  if (versions.size === 1) {
    console.log(`versions in sync: ${[...versions][0]}`);
    process.exit(0);
  }
  for (let i = 0; i < TARGETS.length; i++) {
    console.error(`  ${TARGETS[i].path}: ${current[i].version}`);
  }
  fail("version mismatch across package.json, tauri.conf.json and Cargo.toml");
}

const next = raw ?? [...versions][0];

if (!SEMVER.test(next)) fail(`invalid semver: ${next}`);

const changed = [];

for (let i = 0; i < TARGETS.length; i++) {
  const { path, pattern } = TARGETS[i];
  const { text, version } = current[i];
  if (version === next) continue;
  const updated = text.replace(pattern, `$1${next}$2`);
  if (!dryRun) await writeFile(path, updated);
  changed.push(`${path}: ${version} -> ${next}`);
}

if (changed.length === 0) {
  console.log(`all targets already at ${next}`);
} else {
  console.log(`${dryRun ? "[dry-run] " : ""}version set to ${next}`);
  for (const line of changed) console.log(`  ${line}`);
}
