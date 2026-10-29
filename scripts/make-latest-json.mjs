import { readFile, writeFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dir = args[0] ?? "release-assets";
const repo = args[1];
const tag = args[2];

if (!repo || !tag) {
  console.error("usage: node scripts/make-latest-json.mjs <assets-dir> <owner/repo> <tag>");
  process.exit(1);
}

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const files = readdirSync(dir);
const expectedVersion = tag.replace(/^v/, "");

if (pkg.version !== expectedVersion) {
  console.error(`error: tag ${tag} does not match package.json version ${pkg.version}`);
  process.exit(1);
}

const targets = [
  { key: "windows-x86_64", suffixes: ["-setup.exe"] },
  { key: "linux-x86_64", suffixes: [".AppImage.tar.gz"] },
];

function pickPlatform({ key, suffixes }) {
  for (const suffix of suffixes) {
    const bundle = files.find((file) => file.endsWith(suffix) && !file.endsWith(".sig"));
    if (!bundle) continue;

    const signatureFile = `${bundle}.sig`;
    if (!files.includes(signatureFile)) {
      console.error(`error: missing signature ${signatureFile} for ${bundle}`);
      process.exit(1);
    }

    return { key, bundle, signatureFile };
  }
  console.warn(`warn: no updater bundle for ${key}, skipping`);
  return null;
}

const platforms = {};

for (const target of targets) {
  const picked = pickPlatform(target);
  if (!picked) continue;

  const signature = (await readFile(path.join(dir, picked.signatureFile), "utf8")).trim();
  if (signature === "") {
    console.error(`error: signature file ${picked.signatureFile} is empty`);
    process.exit(1);
  }

  platforms[picked.key] = {
    signature,
    url: `https://github.com/${repo}/releases/download/${tag}/${picked.bundle}`,
  };
}

if (Object.keys(platforms).length === 0) {
  console.error(`error: no updater bundle found in ${dir}`);
  process.exit(1);
}

const manifest = {
  version: pkg.version,
  notes: pkg.description ?? "",
  pub_date: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  platforms,
};

await writeFile(path.join(dir, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
