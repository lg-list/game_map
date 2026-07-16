import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pagesRoot = join(root, "pages", "maps");
const dataRoot = join(root, "data");
const siteUrl = "https://wandergamemap.com";
const siteName = "Wander Game Map";
const assetVersion = "20260620-content-quality";
const adsenseScript = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1607011220192909" crossorigin="anonymous"></script>';
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
  const shortened = text
    .slice(0, max - 1)
    .replace(/\s+\S*$/, "")
    .replace(/[,\s;:]+$/, "")
    .trim();
  return `${shortened}.`;
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

function markerExamples(mapData, limit = 8) {
  const features = Array.isArray(mapData?.features) ? mapData.features : [];
  const used = new Set();
  return features
    .map((feature) => safeLabel(feature?.properties?.title, ""))
    .filter((label) => /[A-Za-z]{3}/.test(label))
    .filter((label) => label && !/^(map marker|point of interest|location|unknown)$/i.test(label))
    .filter((label) => !used.has(label.toLowerCase()) && used.add(label.toLowerCase()))
    .slice(0, limit);
}

function markerDescriptionExamples(mapData, limit = 4) {
  const features = Array.isArray(mapData?.features) ? mapData.features : [];
  const used = new Set();
  return features
    .map((feature) => {
      const title = safeLabel(feature?.properties?.title, "");
      const description = cleanText(feature?.properties?.description || feature?.properties?.body || "");
      if (!title || !description || description.length < 24) return null;
      const text = sentence(description, 132);
      const key = `${title.toLowerCase()}|${text.toLowerCase()}`;
      if (used.has(key)) return null;
      used.add(key);
      return { title, description: text };
    })
    .filter(Boolean)
    .slice(0, limit);
}

function categoryBreakdown(mapData, limit = 6) {
  const categories = mapData?.metadata?.categories || mapData?.categories || [];
  const subcategories = mapData?.metadata?.subcategories || mapData?.subcategories || [];
  const features = Array.isArray(mapData?.features) ? mapData.features : [];
  const subToCategory = new Map(subcategories.map((item) => [item.externalId, item.categoryExternalId]));
  const counts = new Map();
  for (const feature of features) {
    const subId = feature?.properties?.subcategoryExternalId || feature?.subcategoryExternalId;
    const categoryId = feature?.properties?.categoryExternalId || feature?.categoryExternalId || subToCategory.get(subId);
    if (categoryId) counts.set(categoryId, (counts.get(categoryId) || 0) + 1);
  }
  return categories
    .map((category) => ({
      label: safeLabel(category.title || category.name, "Map category"),
      count: counts.get(category.externalId) || 0,
      description: cleanText(category.description || ""),
    }))
    .filter((item) => item.label && item.count)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function coordinateBounds(mapData) {
  const features = Array.isArray(mapData?.features) ? mapData.features : [];
  const points = features
    .map((feature) => feature?.geometry?.coordinates)
    .filter((coordinates) => Array.isArray(coordinates) && coordinates.length >= 2)
    .map(([x, y]) => [Number(x), Number(y)])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!points.length) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function scopeSentence(mapData, mapName) {
  const bounds = coordinateBounds(mapData);
  if (!bounds) return `The ${mapName} dataset is organized as coordinate-based records that can be searched, filtered, and opened from the interactive layer.`;
  const width = Math.round(bounds.maxX - bounds.minX);
  const height = Math.round(bounds.maxY - bounds.minY);
  return `The ${mapName} dataset spans roughly ${width.toLocaleString("en-US")} by ${height.toLocaleString("en-US")} coordinate units, so search and category filters are usually faster than scanning the full canvas manually.`;
}

function plural(value, singular, pluralText = `${singular}s`) {
  return `${Number(value || 0).toLocaleString("en-US")} ${Number(value || 0) === 1 ? singular : pluralText}`;
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

function siteFooter() {
  return `<footer class="site-footer">
      <div class="footer-brand"><img class="brand-logo" src="/logo.png" alt="Wander Game Map" /></div>
      <nav class="footer-links" aria-label="Footer navigation">
        <a href="/maps/">Maps</a>
        <a href="/guides/">Guides</a>
        <a href="/about/">About</a>
        <a href="/editorial-policy/">Editorial Policy</a>
        <a href="/advertising-policy/">Advertising Policy</a>
        <a href="/contact/">Contact</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
      </nav>
    </footer>`;
}

function injectSiteFooter(html) {
  const cleaned = html.replace(/\s*<footer\s+class="site-footer">[\s\S]*?<\/footer>\s*/gi, "\n");
  const footer = `\n    ${siteFooter()}\n`;
  if (/<!-- seo-guide:start -->/i.test(cleaned)) {
    return cleaned.replace(/(\s*<!-- seo-guide:end -->)/i, `$1${footer}`);
  }
  return cleaned.replace(/(\s*<script\s+src="\/script\.js[^>]*><\/script>)/i, `${footer}$1`);
}

function normalizeSiteChrome(html) {
  return html
    .replace(/Game Map Hub/g, siteName)
    .replace(/<a href="\/">Games<\/a>/g, '<a href="/maps/">Maps</a>')
    .replace(/<a href="\/">Maps<\/a>/g, '<a href="/maps/">Maps</a>');
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
  const examples = markerExamples(mapData);
  const descriptionExamples = markerDescriptionExamples(mapData);
  const categories = categoryBreakdown(mapData);
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
  const exampleItems = examples.length
    ? examples.map((label) => `<li>${escapeHtml(label)}</li>`).join("")
    : "<li>Open a marker on the map to view the labels available in this dataset.</li>";
  const categoryCards = categories.length
    ? categories
        .map(
          (item) =>
            `<article><strong>${escapeHtml(item.label)}</strong><span>${plural(item.count, "marker")}</span><p>${escapeHtml(item.description || `${item.label} entries are grouped together so you can isolate this part of the ${map} dataset before zooming into dense areas.`)}</p></article>`,
        )
        .join("")
    : `<article><strong>Searchable layers</strong><span>${plural(markerCount, "marker")}</span><p>The current data is grouped by the filters available in the sidebar. Use those filters to focus the map before opening individual markers.</p></article>`;
  const descriptionCards = descriptionExamples.length
    ? descriptionExamples
        .map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></li>`)
        .join("")
    : examples.slice(0, 4).map((label) => `<li><strong>${escapeHtml(label)}</strong><span>Open this marker in the interactive map to review its recorded location and any available media.</span></li>`).join("");
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
        <p>${escapeHtml(scopeSentence(mapData, map))}</p>
        ${updated ? `<p class="map-guide-updated">Map data last updated ${escapeHtml(updated)}.</p>` : ""}
      </div>
      <section class="map-value-section" aria-labelledby="map-value-title">
        <div>
          <p class="eyebrow">Why this page is useful</p>
          <h2 id="map-value-title">A focused index for ${escapeHtml(map)}</h2>
          <p>This page is designed for players who already know the area they are exploring and need a quick way to narrow the map to a specific marker type, label, or route segment. Instead of presenting a static image, the page keeps the marker list, filter state, and canvas view connected so a search result can be inspected immediately on the map.</p>
        </div>
        <div class="map-value-points">
          <article><strong>Filter before you zoom</strong><span>Reduce clutter by hiding unrelated marker groups before moving around the map.</span></article>
          <article><strong>Use labels as clues</strong><span>Search exact marker labels when you know the item name, activity, location, or route target.</span></article>
          <article><strong>Check the live detail panel</strong><span>Marker panels can include local notes, images, or video references when those records are available.</span></article>
        </div>
      </section>
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
      <section class="category-breakdown" aria-labelledby="category-breakdown-title">
        <div>
          <p class="eyebrow">Category breakdown</p>
          <h2 id="category-breakdown-title">Main marker groups on this map</h2>
        </div>
        <div>${categoryCards}</div>
      </section>
      <section class="dataset-snapshot" aria-labelledby="dataset-snapshot-title">
        <div>
          <p class="eyebrow">Dataset snapshot</p>
          <h2 id="dataset-snapshot-title">What is indexed on this map</h2>
          <p>This page reads the current structured dataset directly. It contains ${markerCount.toLocaleString("en-US")} coordinate-based marker${markerCount === 1 ? "" : "s"}${types.length ? ` across ${types.length.toLocaleString("en-US")} leading filter types shown below` : " organized by the filters above"}. Counts describe the data available on this page; they are not estimates of game completion.</p>
        </div>
        <div>
          <h3>Example searchable labels</h3>
          <ul class="dataset-examples">${exampleItems}</ul>
        </div>
      </section>
      <section class="marker-note-samples" aria-labelledby="marker-note-samples-title">
        <p class="eyebrow">Marker notes</p>
        <h2 id="marker-note-samples-title">Examples from the current data</h2>
        <ul>${descriptionCards}</ul>
      </section>
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

async function listGuide(gameData, gameSlug) {
  const game = cleanText(gameData?.title) || titleCaseSlug(gameSlug);
  const maps = Array.isArray(gameData?.maps) ? gameData.maps : [];
  const markerCount = maps.reduce((sum, map) => sum + Number(map.markerCount || 0), 0);
  const mapSummaries = [];
  const combinedTypes = new Map();
  const combinedExamples = [];
  for (const map of maps) {
    const mapData = (await readJson(join(dataRoot, dataName(gameSlug, map.slug)))) || {};
    const types = markerTypes(mapData, 6);
    const examples = markerExamples(mapData, 5);
    for (const type of types) combinedTypes.set(type.label, (combinedTypes.get(type.label) || 0) + Number(type.count || 0));
    for (const example of examples) {
      if (combinedExamples.length < 12 && !combinedExamples.some((item) => item.toLowerCase() === example.toLowerCase())) combinedExamples.push(example);
    }
    const typeText = types.length ? types.map((item) => item.label).join(", ") : "locations and points of interest";
    const exampleText = examples.length ? examples.join(", ") : "labels available through the live marker search";
    mapSummaries.push(`<article class="map-directory-entry">
          <div>
            <p class="eyebrow">${Number(map.markerCount || 0).toLocaleString("en-US")} searchable markers</p>
            <h3><a href="/maps/${gameSlug}/${map.slug}/">${escapeHtml(map.name || titleCaseSlug(map.slug))}</a></h3>
            <p>The current filters include ${escapeHtml(typeText)}. Searchable labels in this dataset include ${escapeHtml(exampleText)}.</p>
          </div>
          <dl>
            <div><dt>Categories</dt><dd>${Number(map.categoryCount || 0).toLocaleString("en-US") || "Available on map"}</dd></div>
            <div><dt>Marker types</dt><dd>${Number(map.subcategoryCount || types.length || 0).toLocaleString("en-US") || "Available on map"}</dd></div>
            <div><dt>Data updated</dt><dd>${escapeHtml(formatDate(map.updatedAt) || "Current dataset")}</dd></div>
          </dl>
        </article>`);
  }
  const mapNames = maps.map((map) => cleanText(map.name) || titleCaseSlug(map.slug)).filter(Boolean);
  const areaPhrase = mapNames.length ? mapNames.join(", ") : "the available game areas";
  const topTypeRows = [...combinedTypes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([label, count]) => `<li><strong>${escapeHtml(label)}</strong><span>${plural(count, "marker")}</span></li>`)
    .join("");
  const exampleRows = combinedExamples.length
    ? combinedExamples.map((label) => `<li>${escapeHtml(label)}</li>`).join("")
    : "<li>Open an area map to review marker labels in the current dataset.</li>";
  return `    <section class="title-seo-content" aria-labelledby="game-map-guide-title">
      <div>
        <p class="eyebrow">Map directory</p>
        <h2 id="game-map-guide-title">${escapeHtml(game)} interactive maps</h2>
        <p>This directory covers ${escapeHtml(areaPhrase)} for ${escapeHtml(game)}. Across ${maps.length || 1} interactive map${maps.length === 1 ? "" : "s"}, the current datasets contain ${markerCount.toLocaleString("en-US")} coordinate-based markers. Each area has its own search index and filters, so open the map that matches the part of the game you are exploring.</p>
        <p>The directory is built from the same structured marker files used by the interactive pages. That means the map count, marker totals, update dates, and visible filter names are drawn from the local data rather than written as generic landing-page copy.</p>
      </div>
      <div class="directory-facts" aria-label="${escapeHtml(game)} map directory facts">
        <div><strong>${maps.length || 1}</strong><span>area map${maps.length === 1 ? "" : "s"}</span></div>
        <div><strong>${markerCount.toLocaleString("en-US")}</strong><span>searchable markers</span></div>
        <div><strong>${maps.reduce((sum, map) => sum + Number(map.subcategoryCount || 0), 0).toLocaleString("en-US")}</strong><span>marker types</span></div>
      </div>
      <div class="map-directory-list">${mapSummaries.join("")}</div>
      <div class="directory-method">
        <article>
          <h2>Choose the right area</h2>
          <p>Marker searches run inside one area at a time. Select an area above, then search for an exact location or item label. The category checkboxes can hide unrelated markers, while the map controls let you inspect dense groups without changing the size of marker icons.</p>
        </article>
        <article>
          <h2>How this directory is maintained</h2>
          <p>Totals are calculated from the structured map files used by the interactive pages. A count may change when markers are added, removed, renamed, or moved into a different category. Generated summaries on this page use only those recorded fields and do not claim unverified quests, rewards, or completion requirements.</p>
        </article>
      </div>
      <section class="directory-data-review" aria-labelledby="directory-data-review-title">
        <div>
          <p class="eyebrow">Data review</p>
          <h2 id="directory-data-review-title">What the ${escapeHtml(game)} directory covers</h2>
          <p>Use this overview when you are deciding which area map to open first. The most common filter types are listed here so you can tell whether this game page is mainly useful for resources, collectibles, travel points, loot, quests, or other location records.</p>
        </div>
        <div class="directory-data-columns">
          <article>
            <h3>Common marker types</h3>
            <ul>${topTypeRows || "<li><strong>Area markers</strong><span>Open a map to view filters</span></li>"}</ul>
          </article>
          <article>
            <h3>Sample labels</h3>
            <ul>${exampleRows}</ul>
          </article>
        </div>
      </section>
      <section class="map-guide-faq" aria-labelledby="directory-faq-title">
        <h2 id="directory-faq-title">${escapeHtml(game)} map directory FAQ</h2>
        <div>${renderFaq([
          { question: `How many ${game} maps are available?`, answer: `This directory currently links to ${maps.length || 1} interactive area map${maps.length === 1 ? "" : "s"}: ${areaPhrase}.` },
          { question: `How many ${game} markers can I search?`, answer: `The listed maps currently contain ${markerCount.toLocaleString("en-US")} searchable markers in total. Each map page shows its own filters and current count.` },
          { question: "Are marker totals completion percentages?", answer: "No. Marker totals describe records in the current map dataset. They do not represent a required checklist or a guaranteed measure of game completion." },
        ])}</div>
      </section>
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
    /\s*<script\s+async\s+src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-\d+"[^>]*><\/script>\s*/gi,
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

function normalizeVisibleMapCopy(html) {
  return html.replace(
    /(<article\s+class="marker-detail"[^>]*>[\s\S]*?<p>)[\s\S]*?(<\/p>\s*<\/article>)/i,
    "$1Use search or category filters to find locations, loot, resources, collectibles, quests, and other markers on this interactive map.$2",
  );
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
  const output = setBasicHead(removeSeoBlock(versionAssets(normalizeSiteChrome(normalizeVisibleMapCopy(html)))), seo);
  return injectAdsense(versionAssets(output.replace(/(\s*<link rel="icon")/i, `\n    ${tags}$1`)));
}

function breadcrumb(url, game, gameSlug, map, mapSlug) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
    { "@type": "ListItem", position: 2, name: "Maps", item: `${siteUrl}/maps/` },
    { "@type": "ListItem", position: 3, name: game, item: absoluteUrl(`/maps/${gameSlug}/`) },
  ];
  if (map) items.push({ "@type": "ListItem", position: 4, name: map, item: absoluteUrl(`/maps/${gameSlug}/${mapSlug}/`) });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function latestDate(values) {
  const timestamps = values
    .map((value) => new Date(value || "").getTime())
    .filter((value) => Number.isFinite(value));
  if (!timestamps.length) return "";
  return new Date(Math.max(...timestamps)).toISOString().slice(0, 10);
}

function mapsIndexSeo(games) {
  const mapCount = games.reduce((sum, game) => sum + Number(game.maps || 0), 0);
  const markerCount = games.reduce((sum, game) => sum + Number(game.markerCount || 0), 0);
  const description = `Browse the full Wander Game Map index with ${games.length.toLocaleString("en-US")} games, ${mapCount.toLocaleString("en-US")} area maps, and ${markerCount.toLocaleString("en-US")} searchable markers.`;
  return {
    title: "All Interactive Game Maps | Wander Game Map",
    description,
    keywords: "all game maps, interactive map index, game location maps, resource maps, collectible maps",
    url: `${siteUrl}/maps/`,
    image: defaultImage,
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "All Interactive Game Maps",
        url: `${siteUrl}/maps/`,
        description,
        isPartOf: { "@type": "WebSite", name: siteName, url: `${siteUrl}/` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: games.length,
          itemListElement: games.map((game, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${cleanText(game.title) || titleCaseSlug(game.slug)} maps`,
            url: absoluteUrl(`/maps/${game.slug}/`),
          })),
        },
      },
    ],
  };
}

async function mapsIndexPage(games) {
  const mapCount = games.reduce((sum, game) => sum + Number(game.maps || 0), 0);
  const markerCount = games.reduce((sum, game) => sum + Number(game.markerCount || 0), 0);
  const sections = [];
  for (const game of games) {
    const gameData = (await readJson(join(dataRoot, dataName(game.slug)))) || game;
    const maps = Array.isArray(gameData.maps) ? gameData.maps : [];
    const mapLinks = maps
      .map(
        (map) =>
          `<a href="/maps/${game.slug}/${map.slug}/"><span>${escapeHtml(cleanText(map.name) || titleCaseSlug(map.slug))}</span><small>${Number(map.markerCount || 0).toLocaleString("en-US")} markers</small></a>`,
      )
      .join("");
    sections.push(`<article class="map-index-entry">
          <header>
            <h2><a href="/maps/${game.slug}/">${escapeHtml(cleanText(game.title) || titleCaseSlug(game.slug))}</a></h2>
            <p>${Number(game.maps || maps.length || 1).toLocaleString("en-US")} map${Number(game.maps || maps.length || 1) === 1 ? "" : "s"} - ${Number(game.markerCount || 0).toLocaleString("en-US")} markers</p>
          </header>
          <div>${mapLinks}</div>
        </article>`);
  }

  const seo = mapsIndexSeo(games);
  const jsonLd = JSON.stringify(seo.jsonLd, null, 2).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="keywords" content="${escapeHtml(seo.keywords)}" />
    <link rel="canonical" href="${seo.url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${seo.url}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:image" content="${defaultImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${defaultImage}" />
    <script type="application/ld+json" data-seo="true">${jsonLd}</script>
    <link rel="icon" href="/favicon.ico" sizes="32x32" type="image/x-icon" />
    <link rel="stylesheet" href="/styles.css?v=${assetVersion}" />
    ${adsenseScript}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Wander Game Map home"><img class="brand-logo" src="/logo.png" alt="Wander Game Map" /></a>
      <nav class="main-nav" aria-label="Primary navigation"><a href="/maps/">Maps</a><a href="/guides/">Guides</a><a href="/about/">About</a><a href="/editorial-policy/">Editorial Policy</a><a href="/contact/">Contact</a></nav>
      <div class="header-actions"><a class="download-button" href="/">Home</a></div>
    </header>
    <main class="info-page map-index-page">
      <header class="info-hero">
        <p class="eyebrow">Complete map index</p>
        <h1>All interactive game maps</h1>
        <p>Browse ${games.length.toLocaleString("en-US")} game directories, ${mapCount.toLocaleString("en-US")} area maps, and ${markerCount.toLocaleString("en-US")} searchable markers from one crawlable index page.</p>
      </header>
      <section class="map-index-summary" aria-label="Map index summary">
        <div><strong>${games.length.toLocaleString("en-US")}</strong><span>games</span></div>
        <div><strong>${mapCount.toLocaleString("en-US")}</strong><span>area maps</span></div>
        <div><strong>${markerCount.toLocaleString("en-US")}</strong><span>searchable markers</span></div>
      </section>
      <section class="map-index-list" aria-label="All game map links">
        ${sections.join("\n        ")}
      </section>
    </main>
    ${siteFooter()}
  </body>
</html>
`;
  await writeFile(join(pagesRoot, "index.html"), html);
}

async function guidesPage(games) {
  const mapCount = games.reduce((sum, game) => sum + Number(game.maps || 0), 0);
  const markerCount = games.reduce((sum, game) => sum + Number(game.markerCount || 0), 0);
  const updatedGames = games
    .slice()
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 8);
  const updatedRows = updatedGames
    .map(
      (game) =>
        `<li><a href="/maps/${game.slug}/"><strong>${escapeHtml(cleanText(game.title) || titleCaseSlug(game.slug))}</strong><span>${plural(game.markerCount, "marker")} across ${plural(game.maps || 1, "map")}</span></a></li>`,
    )
    .join("");
  const seo = {
    title: "How to Use Interactive Game Maps | Wander Game Map Guides",
    description: "Learn how Wander Game Map organizes searchable game markers, filters, map directories, data updates, and player-friendly route planning pages.",
    keywords: "interactive game map guide, game marker filters, collectible map guide, resource map search",
    url: `${siteUrl}/guides/`,
    image: defaultImage,
    type: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to use interactive game maps",
        name: "How to use interactive game maps",
        url: `${siteUrl}/guides/`,
        description: "A practical guide to using searchable marker maps, filters, and game directory pages on Wander Game Map.",
        publisher: { "@type": "Organization", name: siteName, url: `${siteUrl}/` },
        mainEntityOfPage: `${siteUrl}/guides/`,
      },
    ],
  };
  const jsonLd = JSON.stringify(seo.jsonLd, null, 2).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="keywords" content="${escapeHtml(seo.keywords)}" />
    <link rel="canonical" href="${seo.url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${seo.url}" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:image" content="${defaultImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${defaultImage}" />
    <script type="application/ld+json" data-seo="true">${jsonLd}</script>
    <link rel="icon" href="/favicon.ico" sizes="32x32" type="image/x-icon" />
    <link rel="stylesheet" href="/styles.css?v=${assetVersion}" />
    ${adsenseScript}
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Wander Game Map home"><img class="brand-logo" src="/logo.png" alt="Wander Game Map" /></a>
      <nav class="main-nav" aria-label="Primary navigation"><a href="/maps/">Maps</a><a href="/guides/">Guides</a><a href="/about/">About</a><a href="/editorial-policy/">Editorial Policy</a><a href="/contact/">Contact</a></nav>
      <div class="header-actions"><a class="download-button" href="/maps/">Browse maps</a></div>
    </header>
    <main class="info-page guide-page">
      <header class="info-hero">
        <p class="eyebrow">Player guide</p>
        <h1>How to use interactive game maps</h1>
        <p>Wander Game Map is built around searchable marker data rather than static screenshots. This guide explains how the site organizes ${mapCount.toLocaleString("en-US")} maps and ${markerCount.toLocaleString("en-US")} markers so players can find resources, collectibles, travel points, loot, NPCs, quests, and other location records faster.</p>
      </header>
      <article class="guide-article">
        <section>
          <h2>Start with the game directory</h2>
          <p>Every game has a directory page that lists the available area maps, current marker totals, update dates, and the most common marker types. Use that page first when a game has more than one area, because each map keeps its own search index and filter set.</p>
          <p>The directory pages are intentionally plain and data-focused: they show what is actually present in the local structured files, rather than promising a full completion checklist for every game.</p>
        </section>
        <section>
          <h2>Search before scanning the canvas</h2>
          <p>Large game maps can contain hundreds or thousands of markers. Typing a partial item name, activity, landmark, resource, or collectible label into the search field is usually faster than panning across the whole map.</p>
          <p>After selecting a search result, use the category checkboxes to keep nearby icons readable. Marker icons stay a consistent visual size while the map background zooms, which helps dense areas stay usable on desktop and mobile.</p>
        </section>
        <section>
          <h2>Read marker details only when needed</h2>
          <p>Marker panels can include notes, images, or videos when those records are available. Media is loaded lazily, so opening a map should not wait for every marker attachment on the page.</p>
          <p>If a marker has no long note, the map still provides value through its coordinates, category, title, and relationship to nearby markers. The detail page text explains the dataset scope so visitors and search engines can understand what is available before interacting with the canvas.</p>
        </section>
        <section>
          <h2>How we keep pages useful for search</h2>
          <p>Map pages include a visible data snapshot, category breakdown, example labels, FAQ content, and links back to related maps. These sections are generated from local map data so each page reflects the game and area it represents.</p>
          <p>Totals may change when a map is updated. Counts describe the records available on Wander Game Map; they do not represent a guaranteed completion percentage or official game requirement.</p>
        </section>
      </article>
      <aside class="guide-latest" aria-labelledby="guide-latest-title">
        <div>
          <p class="eyebrow">Recently updated</p>
          <h2 id="guide-latest-title">Map directories to review</h2>
        </div>
        <ul>${updatedRows}</ul>
      </aside>
    </main>
    ${siteFooter()}
  </body>
</html>
`;
  await mkdir(join(root, "guides"), { recursive: true });
  await writeFile(join(root, "guides", "index.html"), html);
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
  const description = sentence(`${game} ${map} interactive map with ${markerCount.toLocaleString("en-US")} searchable markers. Find ${categoryText.toLowerCase()}${extraText} using category filters and map search.`, 175);
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
  await mapsIndexPage(games);
  await guidesPage(games);
  const path = join(root, "index.html");
  const html = await readFile(path, "utf8");
  await writeFile(path, injectSiteFooter(injectGuide(injectSeo(html, homeSeo(games)), await homeGuide(games))));
}

async function enhanceMapPages() {
  const games = (await readJson(join(dataRoot, "site-games.json"))) || [];
  const urls = [
    { loc: `${siteUrl}/`, priority: "1.0" },
    { loc: `${siteUrl}/maps/`, priority: "0.95" },
    { loc: `${siteUrl}/guides/`, priority: "0.6" },
    { loc: `${siteUrl}/about/`, priority: "0.5" },
    { loc: `${siteUrl}/editorial-policy/`, priority: "0.5" },
    { loc: `${siteUrl}/advertising-policy/`, priority: "0.5" },
    { loc: `${siteUrl}/contact/`, priority: "0.4" },
    { loc: `${siteUrl}/privacy/`, priority: "0.3" },
    { loc: `${siteUrl}/terms/`, priority: "0.3" },
  ];
  let changed = 0;
  const gameSlugs = await pageDirs(pagesRoot);
  for (const gameSlug of gameSlugs) {
    const gameData = (await readJson(join(dataRoot, dataName(gameSlug)))) || { title: titleCaseSlug(gameSlug), maps: [] };
    const listPath = join(pagesRoot, gameSlug, "index.html");
    try {
      const html = await readFile(listPath, "utf8");
      await writeFile(listPath, injectSiteFooter(injectGuide(injectSeo(html, listSeo(gameData, gameSlug)), await listGuide(gameData, gameSlug))));
      const listLastmod = latestDate([gameData.updatedAt, ...(gameData.maps || []).map((map) => map.updatedAt)]);
      urls.push({ loc: absoluteUrl(`/maps/${gameSlug}/`), priority: "0.8", lastmod: listLastmod });
      changed += 1;
    } catch {}

    for (const mapSlug of await pageDirs(join(pagesRoot, gameSlug))) {
      const mapData = (await readJson(join(dataRoot, dataName(gameSlug, mapSlug)))) || { metadata: { name: titleCaseSlug(mapSlug) }, features: [] };
      const detailPath = join(pagesRoot, gameSlug, mapSlug, "index.html");
      try {
        const html = await readFile(detailPath, "utf8");
        await writeFile(
          detailPath,
          injectSiteFooter(
            injectGuide(
              injectSeo(html, detailSeo(gameData, mapData, gameSlug, mapSlug)),
              detailGuide(gameData, mapData, gameSlug, mapSlug),
            ),
          ),
        );
        const mapEntry = (gameData?.maps || []).find((item) => item.slug === mapSlug);
        urls.push({ loc: absoluteUrl(`/maps/${gameSlug}/${mapSlug}/`), priority: "0.7", lastmod: latestDate([mapEntry?.updatedAt]) });
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
      (entry) => `  <url>\n    <loc>${escapeHtml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod || today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
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
