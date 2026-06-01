import { readFile } from "node:fs/promises";

const tileKey = process.argv[2];
const concurrency = Number(process.argv[3] || 24);
const host = process.argv[4] || "http://127.0.0.1:5173";

if (!tileKey) {
  console.error("Usage: node scripts/warm-tiles.mjs <game/map> [concurrency] [host]");
  process.exit(1);
}

const sources = JSON.parse(await readFile(new URL("../data/tile-sources.json", import.meta.url), "utf8"));
const source = sources[tileKey];
if (!source) {
  console.error(`Unknown tile source: ${tileKey}`);
  process.exit(1);
}

const minZoom = Math.max(0, Number(source.minZoom || 1));
const maxZoom = Number(source.maxZoom || 0);
const tasks = [];
for (let z = minZoom; z <= maxZoom; z += 1) {
  const count = 2 ** z;
  for (let x = 0; x < count; x += 1) {
    for (let y = 0; y < count; y += 1) {
      tasks.push({ z, x, y });
    }
  }
}

let cursor = 0;
let ok = 0;
let failed = 0;
let skipped = 0;
let lastLog = Date.now();

async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor++];
    const url = `${host}/tiles/${tileKey}/${task.z}/${task.x}/${task.y}.webp?warm=1`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        await response.arrayBuffer();
        ok += 1;
      } else if (response.status === 404) {
        skipped += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }

    const now = Date.now();
    if (now - lastLog > 1000 || ok + failed === tasks.length) {
      lastLog = now;
      process.stdout.write(`\r${tileKey}: ${ok + skipped + failed}/${tasks.length} checked, ${ok} cached, ${skipped} empty, ${failed} failed`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
process.stdout.write("\n");
if (failed) process.exitCode = 1;
