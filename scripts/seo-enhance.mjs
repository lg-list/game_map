import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pagesRoot = join(root, "pages", "maps");
const dataRoot = join(root, "data");
const siteUrl = "http://wandergamemap.com";
const siteName = "Wander Game Map";
const assetVersion = "20260603-3eb5b4f";
const defaultImage = `${siteUrl}/logo.png`;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function absoluteUrl(pathname = "/") {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const path = String(pathname || "/");
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/[\ufffd]/g, "")
    .replace(/(?:\u951f|\u8119|\u8117|\u6c13|\u5fd9|\u83bd|\u732b|\u8305|\u679a)/g, "")
    .replace(/[\u3400-\u9fff]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseSlug(slug) {
  return String(slug ?? "")
    .split("-")
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function sentence(value, max = 158) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}.`;
}

function titleLimit(value, max = 68) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  const shortened = text.slice(0, max - 1).replace(/\s+\S*$/, "").trim();
  return shortened.length >= 35 ? shortened : text.slice(0, max - 1).trim();
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function pageDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function dataName(gameSlug, mapSlug = "") {
  return mapSlug ? `${gameSlug}-${mapSlug}.json` : `${gameSlug}.json`;
}

function imageUrl(pathname) {
  const value = String(pathname || "").trim();
  if (!value) return defaultImage;
  if (/^url\(['"]?/.test(value)) {
    return imageUrl(value.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, ""));
  }
  return absoluteUrl(value);
}

function topCategories(mapData) {
  const categories = mapData?.metadata?.categories || mapData?.categories || [];
  const names = categories.map((category) => cleanText(category.title || category.name)).filter(Boolean);
  const useful = [...new Set(names.filter((name) => !/^(category|misc|other)$/i.test(name)))].slice(0, 4);
  return useful.length ? useful : ["locations", "resources", "collectibles", "loot"];
}

function removeSeoBlock(html) {
  return html
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name="robots"[^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+(?:property|name)="(?:og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, "\n")
    .replace(/\s*<script\s+type="application\/ld\+json"\s+data-seo="true">[\s\S]*?<\/script>\s*/gi, "\n");
}

function versionAssets(html) {
  return html
    .replace(/href="\/styles\.css(?:\?v=[^"]*)?"/gi, `href="/styles.css?v=${assetVersion}"`)
    .replace(/src="\/script\.js(?:\?v=[^"]*)?"/gi, `src="/script.js?v=${assetVersion}"`);
}

function setBasicHead(html, { title, description, keywords }) {
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
  return output;
}

function injectSeo(html, seo) {
  const jsonLd = JSON.stringify(seo.jsonLd, null, 2).replace(/</g, "\\u003c");
  const tags = [
    `<link rel="canonical" href="${escapeHtml(seo.url)}" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `<meta property="og:type" content="${escapeHtml(seo.type || "website")}" />`,
    `<meta property="og:url" content="${escapeHtml(seo.url)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(seo.image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(seo.image)}" />`,
    `<script type="application/ld+json" data-seo="true">${jsonLd}</script>`,
  ].join("\n    ");
  const output = setBasicHead(removeSeoBlock(versionAssets(html)), seo);
  return versionAssets(output.replace(/(\s*<link rel="icon")/i, `\n    ${tags}$1`));
}

function breadcrumb(url, game, gameSlug, map, mapSlug) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name: "Maps", item: `${siteUrl}/#library` },
    { "@type": "ListItem", position: 3, name: game, item: absoluteUrl(`/maps/${gameSlug}/`) },
  ];
  if (map) items.push({ "@type": "ListItem", position: 4, name: map, item: absoluteUrl(`/maps/${gameSlug}/${mapSlug}/`) });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function homeSeo(games) {
  const gameCount = games.length;
  const mapCount = games.reduce((sum, game) => sum + Number(game.maps || 0), 0);
  const markerCount = games.reduce((sum, game) => sum + Number(game.markerCount || 0), 0);
  const description = `Browse ${mapCount.toLocaleString("en-US")} interactive game maps with ${markerCount.toLocaleString("en-US")} searchable markers for resources, collectibles, quests, loot, NPCs, and locations.`;
  return {
    title: "Interactive Game Maps for Resources, Collectibles and Locations",
    description,
    keywords: "interactive game maps, game resource map, collectible locations, quest markers, loot map",
    url: `${siteUrl}/`,
    image: imageUrl("/assets/images/games/arc-raiders/hero.webp"),
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: `${siteUrl}/`,
        description,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${siteName} map library`,
        url: `${siteUrl}/`,
        numberOfItems: gameCount,
        hasPart: games.slice(0, 30).map((game) => ({
          "@type": "CollectionPage",
          name: `${game.title} maps`,
          url: absoluteUrl(game.href),
        })),
      },
    ],
  };
}

function listSeo(gameData, gameSlug) {
  const game = cleanText(gameData?.title) || titleCaseSlug(gameSlug);
  const maps = Array.isArray(gameData?.maps) ? gameData.maps : [];
  const mapNames = maps.map((map) => cleanText(map.name)).filter(Boolean);
  const markerCount = maps.reduce((sum, map) => sum + Number(map.markerCount || 0), 0);
  const areaText = mapNames.slice(0, 3).join(", ") || "all areas";
  const title = titleLimit(`${game} Map List - Locations`, 64);
  const description = sentence(`${game} interactive map list for ${areaText}. Browse ${maps.length || 1} area map${maps.length === 1 ? "" : "s"} with ${markerCount.toLocaleString("en-US")} markers for locations, resources, collectibles, loot, and quests.`, 170);
  const url = absoluteUrl(`/maps/${gameSlug}/`);
  const image = imageUrl(gameData?.heroUrl || `/assets/images/games/${gameSlug}/hero.webp`);
  return {
    title,
    description,
    keywords: `${game} map, ${game} interactive map, ${game} locations, ${game} collectibles, ${game} resource map`,
    url,
    image,
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        url,
        description,
        image,
        isPartOf: { "@type": "WebSite", name: siteName, url: `${siteUrl}/` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: maps.map((map, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${game} ${cleanText(map.name) || titleCaseSlug(map.slug)} map`,
            url: absoluteUrl(`/maps/${gameSlug}/${map.slug}/`),
          })),
        },
      },
      breadcrumb(url, game, gameSlug),
    ],
  };
}

function detailSeo(gameData, mapData, gameSlug, mapSlug) {
  const game = cleanText(gameData?.title) || titleCaseSlug(gameSlug);
  const map = cleanText(mapData?.metadata?.name) || titleCaseSlug(mapSlug);
  const categories = topCategories(mapData);
  const markerCount = Number(mapData?.features?.length || mapData?.totalCollectibles || 0);
  const categoryText = categories.join(", ");
  const longTitle = `${game} ${map} Map Locations`;
  const title = titleLimit(
    longTitle.length <= 64 ? longTitle : `${game} ${map} Map`,
    64,
  );
  const existing = new Set(categories.map((category) => category.toLowerCase()));
  const extras = ["quests", "loot", "resources", "collectibles"].filter((item) => !existing.has(item));
  const extraText = extras.length ? `, plus ${extras.join(", ")}` : "";
  const description = sentence(`Use the ${game} ${map} interactive map to find ${categoryText.toLowerCase()}${extraText}, and other searchable location markers.${markerCount ? ` Includes ${markerCount.toLocaleString("en-US")} markers.` : ""}`, 175);
  const url = absoluteUrl(`/maps/${gameSlug}/${mapSlug}/`);
  const mapEntry = (gameData?.maps || []).find((item) => item.slug === mapSlug);
  const image = imageUrl(mapEntry?.thumbnailUrl || gameData?.heroUrl || `/assets/images/games/${gameSlug}/hero.webp`);
  return {
    title,
    description,
    keywords: `${game} ${map} map, ${game} ${map} interactive map, ${game} ${map} locations, ${game} ${map} collectibles, ${game} ${map} resource map`,
    url,
    image,
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url,
        description,
        image,
        isPartOf: { "@type": "WebSite", name: siteName, url: `${siteUrl}/` },
        about: [
          { "@type": "VideoGame", name: game },
          { "@type": "Map", name: `${game} ${map} map` },
        ],
        mainEntity: {
          "@type": "Dataset",
          name: `${game} ${map} marker data`,
          description: `${markerCount.toLocaleString("en-US")} searchable ${game} ${map} map markers.`,
          keywords: categories,
        },
      },
      breadcrumb(url, game, gameSlug, map, mapSlug),
    ],
  };
}

async function enhanceHome() {
  const games = (await readJson(join(dataRoot, "site-games.json"))) || [];
  const path = join(root, "index.html");
  const html = await readFile(path, "utf8");
  await writeFile(path, injectSeo(html, homeSeo(games)));
}

async function enhanceMapPages() {
  const urls = [{ loc: `${siteUrl}/`, priority: "1.0" }];
  let changed = 0;
  const gameSlugs = await pageDirs(pagesRoot);
  for (const gameSlug of gameSlugs) {
    const gameData = (await readJson(join(dataRoot, dataName(gameSlug)))) || { title: titleCaseSlug(gameSlug), maps: [] };
    const listPath = join(pagesRoot, gameSlug, "index.html");
    try {
      const html = await readFile(listPath, "utf8");
      await writeFile(listPath, injectSeo(html, listSeo(gameData, gameSlug)));
      urls.push({ loc: absoluteUrl(`/maps/${gameSlug}/`), priority: "0.8" });
      changed += 1;
    } catch {}

    for (const mapSlug of await pageDirs(join(pagesRoot, gameSlug))) {
      const mapData = (await readJson(join(dataRoot, dataName(gameSlug, mapSlug)))) || { metadata: { name: titleCaseSlug(mapSlug) }, features: [] };
      const detailPath = join(pagesRoot, gameSlug, mapSlug, "index.html");
      try {
        const html = await readFile(detailPath, "utf8");
        await writeFile(detailPath, injectSeo(html, detailSeo(gameData, mapData, gameSlug, mapSlug)));
        urls.push({ loc: absoluteUrl(`/maps/${gameSlug}/${mapSlug}/`), priority: "0.7" });
        changed += 1;
      } catch {}
    }
  }
  return { changed, urls };
}

async function writeSitemap(urls) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (entry) => `  <url>\n    <loc>${escapeHtml(entry.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join("\n")}\n</urlset>\n`;
  await writeFile(join(root, "sitemap.xml"), body);
}

async function writeRobots() {
  await writeFile(
    join(root, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  );
}

await enhanceHome();
const { changed, urls } = await enhanceMapPages();
await writeSitemap(urls);
await writeRobots();

const sitemapSize = (await stat(join(root, "sitemap.xml"))).size;
console.log(`SEO enhanced ${changed + 1} pages. Generated ${urls.length} sitemap URLs (${sitemapSize} bytes).`);
