import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pagesRoot = join(root, "pages", "maps");
const dataRoot = join(root, "data");
const siteUrl = "https://wandergamemap.com";
const siteName = "Wander Game Map";
const assetVersion = "20260611-seoguide";
const adsenseScript = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3173901746543144" crossorigin="anonymous"></script>';
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

function safeLabel(value, fallback = "") {
  const text = cleanText(value);
  if (!text || /[?]{2,}/.test(text) || text.length > 48) return fallback;
  return text;
}

function iconLabel(icon, fallback = "Map Marker") {
  const value = String(icon || "").toLowerCase();
  if (/campfire/.test(value)) return "Campfire";
  if (/tower|antenna|broadcast/.test(value)) return "Signal Tower";
  if (/bridge/.test(value)) return "Bridge";
  if (/water|well/.test(value)) return "Water";
  if (/chest|box|crate|cache|gift/.test(value)) return "Loot Container";
  if (/key/.test(value)) return "Key Item";
  if (/book|document|file|memory|blueprint/.test(value)) return "Document";
  if (/shop|cart|vendor/.test(value)) return "Vendor";
  if (/skull|sword|enemy|robot|wolf|boss/.test(value)) return "Enemy";
  if (/tree|wood|log/.test(value)) return "Wood";
  if (/flower|plant|leaf|grass|mushroom|carrot/.test(value)) return "Plant";
  if (/gem|diamond|rock|stone|mineral|pick-axe/.test(value)) return "Mineral";
  if (/food|berry|fruit|meat/.test(value)) return "Food";
  if (/marker|landmark|archway|house|building/.test(value)) return "Point of Interest";
  return fallback;
}

function markerTypes(mapData, limit = 10) {
  const subcategories = mapData?.metadata?.subcategories || mapData?.subcategories || [];
  const features = Array.isArray(mapData?.features) ? mapData.features : [];
  const counts = new Map();
  features.forEach((feature) => {
    const id = feature?.properties?.subcategoryExternalId || feature?.subcategoryExternalId;
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  });
  const used = new Set();
  return subcategories
    .map((subcategory) => {
      const label = safeLabel(subcategory.title, iconLabel(subcategory.icon));
      return { label, count: counts.get(subcategory.externalId) || 0 };
    })
    .filter(({ label }) => label && !used.has(label) && used.add(label))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function formatDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function removeGuideBlock(html) {
  return html.replace(/\s*<!-- seo-guide:start -->[\s\S]*?<!-- seo-guide:end -->\s*/gi, "\n");
}

function injectGuide(html, guide) {
  const cleaned = removeGuideBlock(html);
  const block = `\n    <!-- seo-guide:start -->\n${guide}\n    <!-- seo-guide:end -->\n`;
  return cleaned.replace(/(\s*<script\s+src="\/script\.js[^>]*><\/script>)/i, `${block}$1`);
}

function renderFaq(items) {
  return items
    .map(
      ({ question, answer }) =>
        `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`,
    )
    .join("\n          ");
}

function detailGuide(gameData, mapData, gameSlug, mapSlug) {
  const game = cleanText(gameData?.title) || titleCaseSlug(gameSlug);
  const map = cleanText(mapData?.metadata?.name) || titleCaseSlug(mapSlug);
  const markerCount = Number(mapData?.features?.length || mapData?.totalCollectibles || 0);
  const types = markerTypes(mapData);
  const mapEntry = (gameData?.maps || []).find((item) => item.slug === mapSlug);
  const updated = formatDate(mapEntry?.updatedAt);
  const siblingMaps = (gameData?.maps || []).filter((item) => item.slug !== mapSlug).slice(0, 6);
  const leadingTypes = types.slice(0, 5).map((item) => item.label);
  const typePhrase = leadingTypes.length ? leadingTypes.join(", ") : "locations, resources, loot, and collectibles";
  const faq = [
    {
      question: `How many markers are on the ${game} ${map} map?`,
      answer: markerCount
        ? `This map currently includes ${markerCount.toLocaleString("en-US")} searchable markers. Marker totals can change as the map data is updated.`
        : "The map contains searchable location markers organized by category and marker type.",
    },
    {
      question: `What can I find on the ${map} map?`,
      answer: `The available filters include ${typePhrase}. Use the category panel to show only the marker types relevant to your current route.`,
    },
    {
      question: `How do I search the ${game} interactive map?`,
      answer: "Enter a location or item name in the marker search field, select a result, and use the category checkboxes to reduce clutter around the selected area.",
    },
    {
      question: "Does the map work on mobile?",
      answer: "Yes. On smaller screens, tap the search field to open the marker list and filters, then tap a marker or search result to view its available details.",
    },
  ];
  const typeItems = types.length
    ? types
        .map(
          ({ label, count }) =>
            `<li><strong>${escapeHtml(label)}</strong>${count ? `<span>${count.toLocaleString("en-US")} markers</span>` : ""}</li>`,
        )
        .join("")
    : "<li><strong>Locations and resources</strong><span>Use the live filters above</span></li>";
  const related = siblingMaps.length
    ? siblingMaps
        .map(
          (item) =>
            `<a href="/maps/${gameSlug}/${item.slug}/"><strong>${escapeHtml(item.name)}</strong><span>${Number(item.markerCount || 0).toLocaleString("en-US")} markers</span></a>`,
        )
        .join("")
    : `<a href="/maps/${gameSlug}/"><strong>${escapeHtml(game)} map list</strong><span>Browse game map details</span></a>`;

  return `    <section class="map-seo-content" aria-labelledby="map-guide-title">
      <div class="map-guide-heading">
        <p class="eyebrow">Interactive map guide</p>
        <h1 id="map-guide-title">${escapeHtml(game)} ${escapeHtml(map)} map</h1>
        <p>Use this interactive map to search ${markerCount ? `${markerCount.toLocaleString("en-US")} ` : ""}locations across ${escapeHtml(map)}. The marker filters cover ${escapeHtml(typePhrase)}, helping you plan a focused route without scanning every icon at once.</p>
        ${updated ? `<p class="map-guide-updated">Map data last updated ${escapeHtml(updated)}.</p>` : ""}
      </div>
      <div class="map-guide-layout">
        <article>
          <h2>What you can find</h2>
          <p>The list below reflects the marker types available in the live map data. Search for a specific name, or hide unrelated categories before zooming into the area you want to explore.</p>
          <ul class="map-guide-types">${typeItems}</ul>
        </article>
        <article>
          <h2>How to use this map</h2>
          <ol class="map-guide-steps">
            <li><strong>Search first.</strong> Enter an item, activity, or location name to jump directly to matching markers.</li>
            <li><strong>Filter the view.</strong> Use Show all, Hide all, and individual checkboxes to keep the map readable.</li>
            <li><strong>Inspect markers.</strong> Select a marker to view its title, description, image, or video when available.</li>
            <li><strong>Reset your route.</strong> Use Reset to return to the default zoom and map position before starting a new search.</li>
          </ol>
        </article>
      </div>
      <section class="map-guide-faq" aria-labelledby="map-faq-title">
        <h2 id="map-faq-title">${escapeHtml(game)} ${escapeHtml(map)} map FAQ</h2>
        <div>${renderFaq(faq)}</div>
      </section>
      <nav class="related-map-links" aria-label="Related ${escapeHtml(game)} maps">
        <div><p class="eyebrow">Keep exploring</p><h2>Related ${escapeHtml(game)} maps</h2></div>
        <div class="related-map-grid">${related}</div>
      </nav>
    </section>`;
}

function listGuide(gameData, gameSlug) {
  const game = cleanText(gameData?.title) || titleCaseSlug(gameSlug);
  const maps = Array.isArray(gameData?.maps) ? gameData.maps : [];
  const markerCount = maps.reduce((sum, map) => sum + Number(map.markerCount || 0), 0);
  const links = maps
    .map(
      (map) =>
        `<a href="/maps/${gameSlug}/${map.slug}/"><strong>${escapeHtml(map.name)}</strong><span>${Number(map.markerCount || 0).toLocaleString("en-US")} markers</span></a>`,
    )
    .join("");
  return `    <section class="title-seo-content" aria-labelledby="game-map-guide-title">
      <div>
        <p class="eyebrow">Map directory</p>
        <h2 id="game-map-guide-title">${escapeHtml(game)} interactive maps</h2>
        <p>Explore ${maps.length || 1} ${escapeHtml(game)} map${maps.length === 1 ? "" : "s"} with ${markerCount.toLocaleString("en-US")} searchable markers. Open an area below to filter locations, resources, collectibles, loot, quests, and other marker types stored in that map's current dataset.</p>
      </div>
      <div class="related-map-grid">${links}</div>
    </section>`;
}

async function homeGuide(games) {
  const sections = [];
  for (const game of games) {
    const gameSlug = game.slug;
    const gameData = (await readJson(join(dataRoot, dataName(gameSlug)))) || game;
    const maps = Array.isArray(gameData?.maps) ? gameData.maps : [];
    const mapLinks = maps
      .map(
        (map) =>
          `<a href="/maps/${gameSlug}/${map.slug}/">${escapeHtml(map.name || titleCaseSlug(map.slug))}</a>`,
      )
      .join("");
    sections.push(`<details>
          <summary><a href="/maps/${gameSlug}/">${escapeHtml(cleanText(game.title) || titleCaseSlug(gameSlug))}</a><span>${Number(game.maps || maps.length || 1).toLocaleString("en-US")} map${Number(game.maps || maps.length || 1) === 1 ? "" : "s"}</span></summary>
          <div>${mapLinks}</div>
        </details>`);
  }

  return `    <section class="home-seo-content" aria-labelledby="complete-map-index-title">
      <div>
        <p class="eyebrow">Complete map index</p>
        <h2 id="complete-map-index-title">Browse every interactive game map</h2>
        <p>Use this crawlable directory to open every game and area map on Wander Game Map. Each map page includes searchable markers, filters, and route planning tools for resources, collectibles, quests, loot, points of interest, and other location data.</p>
      </div>
      <div class="complete-map-index">${sections.join("\n        ")}</div>
    </section>`;
}

function removeSeoBlock(html) {
  return html
    .replace(/\s*<link\s+rel="canonical"[^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name="robots"[^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+(?:property|name)="(?:og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, "\n")
    .replace(/\s*<script\s+type="application\/ld\+json"\s+data-seo="true">[\s\S]*?<\/script>\s*/gi, "\n");
}

function injectAdsense(html) {
  const cleaned = html.replace(
    /\s*<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3173901746543144"[^>]*><\/script>\s*/gi,
    "\n",
  );
  if (/<\/head>/i.test(cleaned)) return cleaned.replace(/<\/head>/i, `    ${adsenseScript}\n  </head>`);
  return cleaned;
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
  return injectAdsense(versionAssets(output.replace(/(\s*<link rel="icon")/i, `\n    ${tags}$1`)));
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
  const faq = [
    {
      "@type": "Question",
      name: `How many markers are on the ${game} ${map} map?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: markerCount
          ? `The interactive map currently includes ${markerCount.toLocaleString("en-US")} searchable markers.`
          : "The interactive map contains searchable markers organized by category.",
      },
    },
    {
      "@type": "Question",
      name: `How do I search the ${game} ${map} map?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the marker search field, category checkboxes, and map zoom controls to find and inspect locations.",
      },
    },
  ];
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
        ...(mapEntry?.updatedAt ? { dateModified: mapEntry.updatedAt } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq,
      },
      breadcrumb(url, game, gameSlug, map, mapSlug),
    ],
  };
}

async function enhanceHome() {
  const games = (await readJson(join(dataRoot, "site-games.json"))) || [];
  const path = join(root, "index.html");
  const html = await readFile(path, "utf8");
  await writeFile(path, injectGuide(injectSeo(html, homeSeo(games)), await homeGuide(games)));
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
      await writeFile(listPath, injectGuide(injectSeo(html, listSeo(gameData, gameSlug)), listGuide(gameData, gameSlug)));
      urls.push({ loc: absoluteUrl(`/maps/${gameSlug}/`), priority: "0.8" });
      changed += 1;
    } catch {}

    for (const mapSlug of await pageDirs(join(pagesRoot, gameSlug))) {
      const mapData = (await readJson(join(dataRoot, dataName(gameSlug, mapSlug)))) || { metadata: { name: titleCaseSlug(mapSlug) }, features: [] };
      const detailPath = join(pagesRoot, gameSlug, mapSlug, "index.html");
      try {
        const html = await readFile(detailPath, "utf8");
        await writeFile(
          detailPath,
          injectGuide(
            injectSeo(html, detailSeo(gameData, mapData, gameSlug, mapSlug)),
            detailGuide(gameData, mapData, gameSlug, mapSlug),
          ),
        );
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
