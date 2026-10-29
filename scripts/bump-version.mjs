import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const TAG_PREFIX = "v";
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const PRERELEASE_ID = /^[0-9A-Za-z-]+$/;
const BUMP_BY_TYPE = { feat: "minor", fix: "patch", perf: "patch", revert: "patch" };
const BUMP_ORDER = { none: 0, patch: 1, minor: 2, major: 3 };
const EMOJI_TOKEN =
  /^(?::[a-z0-9_+-]+:|\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;
const RELEASE_COMMIT = /^chore(?:\([^)]*\))?!?:\s*(?:release|version)\b/i;
const CONVENTIONAL = /^([A-Za-z]+)(?:\([^)]*\))?(!)?:\s*(.*)$/;
const BREAKING_BODY = /^BREAKING[ -]CHANGE:/m;

const options = { dryRun: false, json: false, prerelease: undefined };
const argv = process.argv.slice(2);

for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === "--dry-run") {
    options.dryRun = true;
  } else if (arg === "--json") {
    options.json = true;
  } else if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (arg === "--prerelease" || arg.startsWith("--prerelease=")) {
    const value = arg === "--prerelease" ? argv[index + 1] : arg.slice("--prerelease=".length);
    if (arg === "--prerelease") index += 1;
    if (!value || !PRERELEASE_ID.test(value)) {
      fail(`--prerelease expects an identifier such as beta, got "${value ?? ""}"`);
    }
    options.prerelease = value;
  } else {
    fail(`unknown argument: ${arg}`);
  }
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const currentVersion = String(pkg.version ?? "");

if (!SEMVER.test(currentVersion)) {
  fail(`package.json version "${currentVersion}" is not a valid semver`);
}

const current = splitVersion(currentVersion);
const tags = readTags();
const baselineTag = `${TAG_PREFIX}${currentVersion}`;
const hasBaseline = tags.has(baselineTag);
const range = hasBaseline ? `${baselineTag}..HEAD` : "HEAD";

if (!hasBaseline) {
  warn(`tag ${baselineTag} not found; analysing every commit reachable from HEAD`);
}

const commits = readCommits(range);
let bump = "none";

for (const commit of commits) {
  if (BUMP_ORDER[commit.bump] > BUMP_ORDER[bump]) bump = commit.bump;
}

if (bump === "major" && current.major === 0) bump = "minor";

if (bump === "none") {
  const reason =
    commits.length === 0
      ? `no commits since ${hasBaseline ? baselineTag : "the repository start"}`
      : "no feat/fix/perf/breaking commits since the last release";
  finishSkip(reason);
}

const plannedVersion = options.prerelease
  ? nextPrereleaseVersion(current, bump, options.prerelease)
  : nextStableVersion(current, bump);
const nextVersion = ensureFreeTag(plannedVersion);
const nextTag = `${TAG_PREFIX}${nextVersion}`;

if (!options.dryRun) {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "sync-version.mjs"), nextVersion], {
    cwd: ROOT,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "sync-version.mjs"), "--check"], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

const outputs = {
  version: nextVersion,
  tag: nextTag,
  previous: currentVersion,
  bump,
  skip: "false",
};

writeGithubOutput(outputs);

const source = hasBaseline ? `since ${baselineTag}` : "in the whole history";
console.log(`[release] ${currentVersion} -> ${nextVersion} (${bump}) ${source}`);
console.log(
  options.dryRun
    ? `[release] dry-run: ${nextTag} not tagged, no version file written`
    : `[release] version files updated; next step tags ${nextTag}`
);

for (const commit of commits.filter((item) => item.bump !== "none").slice(0, 20)) {
  console.log(`  ${commit.bump.padEnd(5)} ${commit.hash} ${commit.subject}`);
}

if (options.json) console.log(JSON.stringify(outputs, null, 2));

function printHelp() {
  console.log(`Usage: node scripts/bump-version.mjs [--dry-run] [--json] [--prerelease <id>]

Derives the next semver version from conventional commits since v<package.json version>.

Options:
  --dry-run          Print the plan without writing any file
  --json             Also print the computed outputs as JSON
  --prerelease <id>  Work on a pre-release line, e.g. 0.3.0-beta.0
  -h, --help         Show this message`);
}

function fail(message) {
  console.error(`error: ${message}`);
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::error::${message}`);
  process.exit(1);
}

function warn(message) {
  console.warn(`warn: ${message}`);
  if (process.env.GITHUB_ACTIONS === "true") console.log(`::warning::${message}`);
}

function writeGithubOutput(values) {
  const target = process.env.GITHUB_OUTPUT;
  if (!target) return;
  const payload = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  appendFileSync(target, `${payload}\n`, "utf8");
}

function finishSkip(reason) {
  const outputs = {
    version: currentVersion,
    tag: "",
    previous: currentVersion,
    bump: "none",
    skip: "true",
  };
  writeGithubOutput(outputs);
  console.log(`[release] skip: ${reason}`);
  console.log(`[release] keeping ${currentVersion}; no commit, tag or release will be made`);
  if (options.json) console.log(JSON.stringify(outputs, null, 2));
  process.exit(0);
}

function splitVersion(version) {
  const match = SEMVER.exec(version);
  if (!match) fail(`invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? "",
  };
}

function readTags() {
  try {
    const output = execFileSync("git", ["tag", "--list"], { cwd: ROOT, encoding: "utf8" });
    return new Set(output.split(/\r?\n/).filter(Boolean));
  } catch (error) {
    fail(`cannot list git tags: ${error.message}`);
  }
}

function readCommits(revRange) {
  const format = "--format=%H%x1f%s%x1f%b%x1e";
  let raw;
  try {
    raw = execFileSync("git", ["log", "--no-merges", format, revRange], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    fail(`git log ${revRange} failed: ${error.message}`);
  }
  return raw
    .split("\x1e")
    .map((record) => record.replace(/^\r?\n/, ""))
    .filter((record) => record.trim() !== "")
    .map((record) => {
      const fields = record.split("\x1f");
      const commit = { hash: fields[0].slice(0, 7), subject: fields[1] ?? "" };
      const body = fields.slice(2).join("\x1f");
      return { ...commit, ...classify(commit.subject, body) };
    });
}

function stripEmojiPrefix(text) {
  let value = text.trim();
  for (;;) {
    const match = EMOJI_TOKEN.exec(value);
    if (!match) return value;
    value = value.slice(match[0].length);
  }
}

function classify(subject, body) {
  const cleaned = stripEmojiPrefix(subject);
  if (cleaned.includes("[skip release]") || RELEASE_COMMIT.test(cleaned)) {
    return { bump: "none", type: "release", subject: cleaned };
  }
  const match = CONVENTIONAL.exec(cleaned);
  if (!match) return { bump: "none", type: "other", subject: cleaned };
  const type = match[1].toLowerCase();
  const breaking = match[2] === "!" || BREAKING_BODY.test(body);
  if (breaking) return { bump: "major", type, subject: cleaned };
  return { bump: BUMP_BY_TYPE[type] ?? "none", type, subject: cleaned };
}

function nextStableVersion(current, bump) {
  if (bump === "major") return `${current.major + 1}.0.0`;
  if (bump === "minor") return `${current.major}.${current.minor + 1}.0`;
  return `${current.major}.${current.minor}.${current.patch + 1}`;
}

function nextPrereleaseVersion(current, bump, id) {
  const core = `${current.major}.${current.minor}.${current.patch}`;
  if (current.prerelease === id) return `${core}-${id}.1`;
  const prefix = `${id}.`;
  if (current.prerelease.startsWith(prefix)) {
    const parsed = Number.parseInt(current.prerelease.slice(prefix.length), 10);
    const number = Number.isNaN(parsed) ? 1 : parsed + 1;
    return `${core}-${id}.${number}`;
  }
  return `${nextStableVersion(current, bump)}-${id}.0`;
}

function ensureFreeTag(version) {
  let candidate = version;
  let attempts = 0;
  while (tags.has(`${TAG_PREFIX}${candidate}`)) {
    attempts += 1;
    if (attempts > 100) fail(`could not find a free tag starting from ${TAG_PREFIX}${version}`);
    warn(`tag ${TAG_PREFIX}${candidate} already exists, bumping again`);
    candidate = bumpTaggedVersion(candidate);
  }
  return candidate;
}

function bumpTaggedVersion(version) {
  const parsed = splitVersion(version);
  if (!parsed.prerelease) {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  const id = options.prerelease ?? parsed.prerelease.replace(/\.\d+$/, "");
  const match = /\.(\d+)$/.exec(parsed.prerelease);
  const number = match ? Number(match[1]) + 1 : 1;
  return `${parsed.major}.${parsed.minor}.${parsed.patch}-${id}.${number}`;
}
