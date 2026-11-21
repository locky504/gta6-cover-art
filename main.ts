// Neon Bay Cover Studio — entrypoint for the make.fun gta6-cover-art-01 bounty.
// Written for this entry (Node 22, standard library only).
//
// What it does, in order:
//   1. Copies this repo's app/ (the offline cover-maker web app) into the
//      output directory, and screenshots/ beside it.
//   2. Writes output/dossier.json with the kit's buildDossier helper, so the
//      judge reads exactly the files that were handed in.
//   3. Refuses to hand in an entry the gate would refuse on size: too many
//      app files, an app over the byte cap, a screenshot over its cap, or
//      more than four screenshots.
//
// The grader runs this twice in a fresh container with no network, a
// read-only repo and a writable /output; outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// The gate's own caps (from RULES.txt): app/ at most 993 entries and
// 48 MiB, screenshots/ at most 4 files of 256 KiB each, dossier text
// capped at 160 KiB. Checking here keeps a bad hand-in loud and local.
const APP_MAX_ENTRIES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const SHOTS_MAX_FILES = 4;
const SHOT_MAX_BYTES = 256 * 1024;

function countTree(dir) {
  let entries = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    entries += 1;
    if (info.isDirectory()) {
      const sub = countTree(path);
      entries += sub.entries;
      bytes += sub.bytes;
    } else {
      bytes += info.size;
    }
  }
  return { entries, bytes };
}

function checkShots(dir) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((name) => !name.startsWith("."));
  if (files.length > SHOTS_MAX_FILES) {
    throw new Error(`screenshots/ holds ${files.length} files, at most ${SHOTS_MAX_FILES}`);
  }
  for (const name of files) {
    const size = statSync(join(dir, name)).size;
    if (size > SHOT_MAX_BYTES) {
      throw new Error(`screenshots/${name} is ${size} bytes, over the ${SHOT_MAX_BYTES} cap`);
    }
  }
}

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const appDir = join(repoRoot, "app");
const shotsDir = join(repoRoot, "screenshots");

const appUsage = countTree(appDir);
if (appUsage.entries > APP_MAX_ENTRIES) {
  throw new Error(`app/ holds ${appUsage.entries} entries, at most ${APP_MAX_ENTRIES}`);
}
if (appUsage.bytes > APP_MAX_BYTES) {
  throw new Error(`app/ is ${appUsage.bytes} bytes, over the ${APP_MAX_BYTES} cap`);
}
checkShots(shotsDir);

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, "app"), { recursive: true });
mkdirSync(join(outDir, "screenshots"), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, "screenshots"), { recursive: true });
}

writeFileSync(
  join(outDir, "dossier.json"),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: SHOTS_MAX_FILES, max_bytes: SHOT_MAX_BYTES },
    app_max_files: APP_MAX_ENTRIES,
    app_max_bytes: APP_MAX_BYTES,
    app_path_max_bytes: 1000,
  }),
);

console.log(
  `Neon Bay Cover Studio handed in: app/ ${appUsage.entries} entries, ` +
  `${appUsage.bytes} bytes, dossier written to ${join(outDir, "dossier.json")}`,
);
