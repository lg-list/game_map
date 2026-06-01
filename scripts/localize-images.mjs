import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dataRoot = join(root, "data");
const imageRoot = join(root, "assets", "images", "games");

function extensionFromUrl(url) {
  const clean = String(url || "").split("?")[0];
  const ext = extname(clean).toLowerCase();
  return ext && ext.length <= 6 ? ext : ".webp";
}

function isRemote(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function download(url, outputPath) {
  if (!isRemote(url)) return false;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  return true;
}

async function downloadIfAvailable(url, outputPath) {
  try {
    return await download(url, outputPath);
  } catch (error) {
    console.warn(`Skipped unavailable image: ${error.message}`);
    return false;
  }
}

async function listGameFiles() {
  const files = await readdir(dataRoot);
  const result = [];
  for (const file of files.filter((name) => name.endsWith(".json") && name !== "site-games.json")) {
    const data = await readJson(join(dataRoot, file));
    if (data?.title && Array.isArray(data.maps)) result.push({ file, data, slug: file.replace(/\.json$/i, "") });
  }
  return result;
}

function removeUnusedFeatureFlags(value) {
  if (!value || typeof value !== "object") return false;
  let changed = false;
  if (Object.hasOwn(value, "supportsTeleport")) {
    delete value.supportsTeleport;
    changed = true;
  }
  if (Object.hasOwn(value, "supportsLiveLocation")) {
    delete value.supportsLiveLocation;
    changed = true;
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) changed = removeUnusedFeatureFlags(item) || changed;
    } else if (child && typeof child === "object") {
      changed = removeUnusedFeatureFlags(child) || changed;
    }
  }
  return changed;
}

function cleanSourceOnlyText(value) {
  if (typeof value !== "string") return { value, changed: false };
  let next = value
    .replace(/\[([^\]]+)\]\(\s*u?wemod:\/\/[^)]*\)/gi, "$1")
    .replace(/\(\s*u?wemod:\/\/[^)]*\)/gi, "")
    .replace(/\|\s*u?wemod:\/\/[^\s|)]+/gi, "|")
    .replace(/\s*u?wemod:\/\/[^\s|)\]"]+/gi, "");
  const lines = next.split(/\r?\n/);
  const filtered = lines.filter((line) => !/teleport\s+button|button\s+teleports|button\s+will\s+teleport|teleport\s+feature/i.test(line));
  next = filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { value: next, changed: next !== value };
}

function sanitizeSourceOnlyText(value) {
  if (!value || typeof value !== "object") return false;
  let changed = false;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (typeof value[index] === "string") {
        const result = cleanSourceOnlyText(value[index]);
        value[index] = result.value;
        changed = result.changed || changed;
      } else {
        changed = sanitizeSourceOnlyText(value[index]) || changed;
      }
    }
    return changed;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") {
      const result = cleanSourceOnlyText(child);
      value[key] = result.value;
      changed = result.changed || changed;
    } else if (child && typeof child === "object") {
      changed = sanitizeSourceOnlyText(child) || changed;
    }
  }
  return changed;
}

const games = await listGameFiles();
const heroBySlug = new Map();
let downloaded = 0;
let rewritten = 0;

for (const game of games) {
  const gameDir = join(imageRoot, game.slug);
  await mkdir(gameDir, { recursive: true });

  let localHero = String(game.data.heroUrl || "");
  if (isRemote(game.data.heroUrl)) {
    const ext = extensionFromUrl(game.data.heroUrl);
    const publicPath = `/assets/images/games/${game.slug}/hero${ext}`;
    if (await downloadIfAvailable(game.data.heroUrl, join(gameDir, `hero${ext}`))) {
      localHero = publicPath;
      game.data.heroUrl = publicPath;
      heroBySlug.set(game.slug, publicPath);
      downloaded += 1;
      rewritten += 1;
    }
  } else if (String(game.data.heroUrl || "").startsWith("/")) {
    heroBySlug.set(game.slug, game.data.heroUrl);
  }

  for (const map of game.data.maps) {
    delete map.supportsTeleport;
    delete map.supportsLiveLocation;
    if (!isRemote(map.thumbnailUrl)) continue;
    const ext = extensionFromUrl(map.thumbnailUrl);
    const publicPath = `/assets/images/games/${game.slug}/${map.slug}${ext}`;
    if (await downloadIfAvailable(map.thumbnailUrl, join(gameDir, `${map.slug}${ext}`))) {
      map.thumbnailUrl = publicPath;
      downloaded += 1;
      rewritten += 1;
    }
  }

  if (!String(localHero).startsWith("/") && game.data.maps?.[0]?.thumbnailUrl?.startsWith("/")) {
    game.data.heroUrl = game.data.maps[0].thumbnailUrl;
    heroBySlug.set(game.slug, game.data.heroUrl);
    rewritten += 1;
  }

  await writeFile(join(dataRoot, game.file), `${JSON.stringify(game.data, null, 2)}\n`);
}

async function rewriteGameCollection(fileName) {
  const collectionPath = join(dataRoot, fileName);
  const collection = await readJson(collectionPath);
  if (!Array.isArray(collection)) return;
  for (const game of collection) {
    const localHero = heroBySlug.get(game.slug) || `/assets/images/games/${game.slug}/hero.webp`;
    game.art = `url('${localHero}')`;
    delete game.teleport;
    delete game.live;
  }
  await writeFile(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
}

await rewriteGameCollection("site-games.json");
await rewriteGameCollection("low-competition-games.json");

for (const file of (await readdir(dataRoot)).filter((name) => name.endsWith(".json"))) {
  const path = join(dataRoot, file);
  const data = await readJson(path);
  const changed = removeUnusedFeatureFlags(data) || sanitizeSourceOnlyText(data);
  if (changed) {
    await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
  }
}

console.log(`Image localization complete. Downloaded ${downloaded} files, rewrote ${rewritten} image references.`);
