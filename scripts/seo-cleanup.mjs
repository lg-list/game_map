import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pagesRoot = join(root, "pages", "maps");
const dataRoot = join(root, "data");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanTitle(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+Map$/i, "")
    .trim();
}

function sentence(value, max = 155) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  const trimmed = text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}.`;
  return trimmed.replace(/\s+Includes\.$/, ".").replace(/\.\.$/, ".");
}

function dataName(gameSlug, mapSlug) {
  return mapSlug ? `${gameSlug}-${mapSlug}.json` : `${gameSlug}.json`;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function getTopCategories(mapData) {
  const categories = mapData?.metadata?.categories || mapData?.categories || [];
  return categories
    .map((category) => cleanTitle(category.title || category.name))
    .filter((name) => name && !/未命名|unnamed/i.test(name))
    .slice(0, 4);
}

function replaceHeadSeo(html, title, description, keywords) {
  let output = html;
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  if (/<meta\s+name="description"/i.test(output)) {
    output = output.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  } else {
    output = output.replace("</title>", `</title>\n    <meta name="description" content="${escapeHtml(description)}" />`);
  }
  if (/<meta\s+name="keywords"/i.test(output)) {
    output = output.replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i, `<meta name="keywords" content="${escapeHtml(keywords)}" />`);
  } else {
    output = output.replace(/(<meta name="description" content="[^"]*" \/>)/i, `$1\n    <meta name="keywords" content="${escapeHtml(keywords)}" />`);
  }
  output = output.replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "");
  output = output.replace(/<link\s+rel="alternate"[^>]*>\s*/gi, "");
  output = output.replace(/<meta\s+(?:property|name)="(?:og:url|twitter:site|twitter:creator)"[^>]*>\s*/gi, "");
  output = output.replace(/<meta\s+(?:property|name)="(?:og:title|twitter:title)"\s+content="[^"]*"\s*\/?>/gi, (match) =>
    match.replace(/content="[^"]*"/, `content="${escapeHtml(title)}"`),
  );
  output = output.replace(/<meta\s+(?:property|name)="(?:og:description|twitter:description)"\s+content="[^"]*"\s*\/?>/gi, (match) =>
    match.replace(/content="[^"]*"/, `content="${escapeHtml(description)}"`),
  );
  output = output.replace(/\s*\|\s*Wander Maps/gi, "");
  output = output.replace(/\s*\|\s*Wand/gi, "");
  return output;
}

function removeExternalAnchors(html) {
  return html.replace(/<a([^>]*?)href="https?:\/\/[^"]+"([^>]*)>/gi, "<span$1$2>").replace(/<\/a>/gi, (match, offset, source) => {
    const before = source.slice(Math.max(0, offset - 240), offset);
    const opens = (before.match(/<span\b/gi) || []).length;
    const closes = (before.match(/<\/span>/gi) || []).length;
    return opens > closes ? "</span>" : match;
  });
}

function removeExternalImages(html) {
  return html
    .replace(/<img\s+src="https?:\/\/[^"]+"\s+alt="([^"]*)"\s*\/?>/gi, '<div class="title-hero-visual" role="img" aria-label="$1"></div>')
    .replace(/<img\s+src="\$undefined"\s+alt="([^"]*)"\s*\/?>/gi, '<div class="title-hero-visual" role="img" aria-label="$1"></div>');
}

function cleanCommon(html) {
  return removeExternalImages(removeExternalAnchors(html))
    .replaceAll("Wander Maps", "Game Map Hub")
    .replaceAll("Wand-style", "game")
    .replaceAll("Wand", "Game Map Hub")
    .replaceAll("Download", "Maps")
    .replaceAll("下载", "地图")
    .replaceAll("Browse Maps", "Map Library")
    .replaceAll("Latest Sync", "Latest Maps")
    .replaceAll("Interactive Map", "Map")
    .replaceAll("Interactive Maps", "Game Maps")
    .replaceAll("interactive map", "map")
    .replaceAll("interactive maps", "game maps")
    .replaceAll("canvas tiles, marker filters, search, zoom, drag, and shared marker icons", "marker categories, search, zoom, and map details")
    .replaceAll("fast canvas tile rendering, category filters, shared marker icons, search, zoom, drag, and marker detail panels", "category filters, search, zoom, and marker detail panels")
    .replaceAll("shared marker icons", "marker categories")
    .replaceAll("Shared icons", "Marker categories")
    .replaceAll("Checklist-ready", "Marker list")
    .replaceAll("synced markers", "map markers")
    .replaceAll("Synced markers", "Map markers")
    .replaceAll("Synced Library", "Map Library")
    .replaceAll("synced maps", "game maps")
    .replaceAll("Latest synced maps", "Latest map pages");
}

function rewriteListPage(html, gameData, gameSlug) {
  const game = cleanTitle(gameData?.title || gameSlug.replaceAll("-", " "));
  const heroUrl = String(gameData?.heroUrl || `/assets/images/games/${gameSlug}/hero.webp`);
  const maps = gameData?.maps || [];
  const mapNames = maps.map((map) => cleanTitle(map.name)).filter(Boolean);
  const markerCount = maps.reduce((sum, map) => sum + Number(map.markerCount || 0), 0);
  const keywordBase = `${game} map list, ${game} locations map, ${game} collectibles map`;
  const title = `${game} map locations list - ${mapNames.slice(0, 2).join(" and ") || "all areas"}`;
  const markerText = markerCount ? ` The local pages include ${markerCount.toLocaleString("en-US")} markers.` : "";
  const description = sentence(
    `${game} map list for location searches. Open ${mapNames.join(", ") || "each area"} to find marker categories, collectibles, resources, and route details.${markerText}`,
    170,
  );
  let output = replaceHeadSeo(cleanCommon(html), title, description, keywordBase);
  output = output.replace(/<h1>[\s\S]*?<\/h1>/i, `<h1>${escapeHtml(game)} map locations</h1>`);
  output = output.replace(
    /<section class="title-hero">[\s\S]*?(?:<img[^>]*>|<div class="title-hero-visual"[^>]*><\/div>)/i,
    `<section class="title-hero">\n        <img src="${escapeHtml(heroUrl)}" alt="${escapeHtml(`${game} map locations`)}" />`,
  );
  output = output.replace(
    /<div class="title-hero-copy">([\s\S]*?)<p>[\s\S]*?<\/p>/i,
    `<div class="title-hero-copy">$1<p>${escapeHtml(`Open a specific ${game} area map to browse marker categories, resource locations, collectibles, and route notes.`)}</p>`,
  );
  output = output.replace(/<h2>Choose a map<\/h2>/gi, `<h2>${escapeHtml(game)} area maps</h2>`);
  output = output.replace(/Open ([^<]+)<\/a>/i, `Open ${escapeHtml(mapNames[0] || "map")}</a>`);
  return output;
}

function rewriteDetailPage(html, gameData, mapData, gameSlug, mapSlug) {
  const game = cleanTitle(gameData?.title || gameSlug.replaceAll("-", " "));
  const map = cleanTitle(mapData?.metadata?.name || mapSlug.replaceAll("-", " "));
  const categories = getTopCategories(mapData);
  const markerCount = Number(mapData?.features?.length || mapData?.totalCollectibles || 0);
  const categoryText = categories.length ? categories.join(", ") : "locations, resources, collectibles";
  const title = `${game} ${map} locations map - ${categoryText}`;
  const markerText = markerCount ? ` Includes ${markerCount.toLocaleString("en-US")} local markers.` : "";
  const description = sentence(
    `Find ${game} ${map} ${categoryText.toLowerCase()} on a focused map page for long-tail searches.${markerText}`,
  );
  const keywords = `${game} ${map} locations, ${game} ${map} resource map, ${game} ${map} collectibles, ${game} ${map} marker list`;
  let output = replaceHeadSeo(cleanCommon(html), title, description, keywords);
  output = output.replace(/<strong>[^<]*<\/strong><\/div>/i, `<strong>${escapeHtml(map)}</strong></div>`);
  output = output.replace(
    /<article class="marker-detail" id="marker-detail"><span>[\s\S]*?<\/article>/i,
    `<article class="marker-detail" id="marker-detail"><span>Selected marker</span><strong>${escapeHtml(map)}</strong><p>Use search or category filters to find ${escapeHtml(categoryText.toLowerCase())} on this ${escapeHtml(game)} map.</p></article>`,
  );
  output = output.replace(/aria-label="[^"]* map"/i, `aria-label="${escapeHtml(`${game} ${map} location map`)}"`);
  return output;
}

async function pageDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function rewriteAllPages() {
  const gameSlugs = await pageDirs(pagesRoot);
  let changed = 0;
  for (const gameSlug of gameSlugs) {
    const gameDir = join(pagesRoot, gameSlug);
    const gameData = await readJson(join(dataRoot, dataName(gameSlug)));
    const listPath = join(gameDir, "index.html");
    try {
      const html = await readFile(listPath, "utf8");
      const next = rewriteListPage(html, gameData, gameSlug);
      if (next !== html) {
        await writeFile(listPath, next);
        changed += 1;
      }
    } catch {}

    const mapSlugs = await pageDirs(gameDir);
    for (const mapSlug of mapSlugs) {
      const detailPath = join(gameDir, mapSlug, "index.html");
      const mapData = await readJson(join(dataRoot, dataName(gameSlug, mapSlug)));
      try {
        const html = await readFile(detailPath, "utf8");
        const next = rewriteDetailPage(html, gameData, mapData, gameSlug, mapSlug);
        if (next !== html) {
          await writeFile(detailPath, next);
          changed += 1;
        }
      } catch {}
    }
  }
  return changed;
}

function rewriteHome(html) {
  let output = cleanCommon(html);
  output = replaceHeadSeo(
    output,
    "Game map locations library - resource and collectible marker pages",
    "Browse low-competition game map pages for specific resource locations, collectible markers, area maps, and route notes.",
    "game resource location maps, collectible marker pages, area map list, game map locations",
  );
  output = output.replace(/<h1>[\s\S]*?<\/h1>/i, "<h1>Game map locations for resources and collectibles</h1>");
  output = output.replace(
    /<p class="hero-text">[\s\S]*?<\/p>/i,
    '<p class="hero-text">Open a game, choose an area, then search the local marker list for resources, collectibles, NPCs, loot, routes, and other location-specific details.</p>',
  );
  output = output.replace(/<a href="#tools">Tools<\/a>/g, "");
  output = output.replace(/<section class="tools-section" id="tools">[\s\S]*?<\/section>\s*/i, "");
  output = output.replace(/<span>Tile sources<\/span>/g, "<span>Area pages</span>");
  output = output.replace(/<p class="eyebrow">Interactive Game Maps<\/p>/g, '<p class="eyebrow">Location Map Library</p>');
  return output;
}

const homePath = join(root, "index.html");
const home = await readFile(homePath, "utf8");
await writeFile(homePath, rewriteHome(home));
const changed = await rewriteAllPages();
console.log(`SEO cleanup complete. Updated ${changed} map pages plus homepage.`);
