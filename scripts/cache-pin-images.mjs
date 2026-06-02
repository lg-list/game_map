import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = join(root, "data");
const cacheRoot = join(root, ".pin-cache", "images");
const target = process.argv[2] || "outbound";
const concurrency = Math.max(1, Number(process.argv[3] || 10));
const size = Number(process.argv[4] || 250);

process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

function usage() {
  console.error("Usage: node scripts/cache-pin-images.mjs <all|game-slug|data-file.json> [concurrency] [size]");
  console.error("Examples:");
  console.error("  node scripts/cache-pin-images.mjs outbound");
  console.error("  node scripts/cache-pin-images.mjs data/outbound-the-coast.json 12");
  console.error("  node scripts/cache-pin-images.mjs all 16");
}

function cachePath(imageId) {
  const safeId = String(imageId).replace(/[^0-9a-z._-]/gi, "_");
  return join(cacheRoot, safeId, `${size}.webp`);
}

async function dataFilesForTarget() {
  const files = (await readdir(dataRoot)).filter((file) => file.endsWith(".json"));
  if (target === "all") {
    return files.map((file) => join(dataRoot, file));
  }
  if (target.endsWith(".json")) {
    const explicit = resolve(root, target);
    if (!existsSync(explicit)) {
      usage();
      throw new Error(`Data file not found: ${target}`);
    }
    return [explicit];
  }
  return files
    .filter((file) => file === `${target}.json` || file.startsWith(`${target}-`))
    .map((file) => join(dataRoot, file));
}

async function collectImageIds(files) {
  const ids = new Set();
  for (const file of files) {
    const data = JSON.parse(await readFile(file, "utf8"));
    if (!Array.isArray(data.features)) continue;
    for (const feature of data.features) {
      const imageId = feature.properties?.imageId;
      if (imageId) ids.add(String(imageId));
    }
  }
  return [...ids];
}

async function downloadImage(imageId) {
  const path = cachePath(imageId);
  if (existsSync(path)) return "cached";
  const url = `https://api-cdn.wemod.com/game_map_pin/${encodeURIComponent(imageId)}/${size}.webp`;
  const response = await fetch(url);
  if (!response.ok) return "missing";
  const body = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  return "downloaded";
}

const files = await dataFilesForTarget();
if (!files.length) {
  usage();
  throw new Error(`No matching data files for target: ${target}`);
}

const ids = await collectImageIds(files);
let done = 0;
let downloaded = 0;
let cached = 0;
let missing = 0;
let failed = 0;

async function worker() {
  while (ids.length) {
    const imageId = ids.shift();
    try {
      const result = await downloadImage(imageId);
      if (result === "downloaded") downloaded += 1;
      else if (result === "cached") cached += 1;
      else missing += 1;
    } catch {
      failed += 1;
    } finally {
      done += 1;
      if (done % 100 === 0 || done === 1 || ids.length === 0) {
        process.stdout.write(`\r${target}: ${done} processed, ${downloaded} downloaded, ${cached} cached, ${missing} missing, ${failed} failed`);
      }
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, ids.length || 1) }, worker));
process.stdout.write(`\nDone. Cached images are in ${cacheRoot}\n`);
