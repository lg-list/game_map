let games = [
  {
    title: "Outbound",
    maps: 2,
    updated: true,
    href: "/maps/outbound/",
    art: "url('/assets/images/games/outbound/hero.webp')",
  },
  {
    title: "Subnautica 2",
    maps: 1,
    updated: true,
    href: "/maps/subnautica-2/",
    art: "url('/assets/images/games/subnautica-2/hero.webp')",
  },
  {
    title: "CODE VEIN II",
    maps: 1,
    updated: true,
    href: "/maps/code-vein-ii/",
    art: "url('/assets/images/games/code-vein-ii/hero.webp')",
  },
  {
    title: "Crimson Desert",
    maps: 1,
    updated: true,
    href: "/maps/crimson-desert/",
    art: "url('/assets/images/games/crimson-desert/pywel.webp')",
  },
  {
    title: "ARC Raiders",
    maps: 7,
    updated: true,
    href: "/maps/arc-raiders/",
    art: "url('/assets/images/games/arc-raiders/hero.webp')",
  },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isBrokenText(value) {
  const text = String(value ?? "");
  return /[\u4e00-\u9fff???????????????]/.test(text);
}

function displayText(value, fallback = "Map Marker") {
  const text = String(value ?? "").trim();
  if (!text || isBrokenText(text)) return fallback;
  return text;
}

function artGradient(seed = "") {
  const palettes = [
    ["#16382f", "#215e8a", "#e8b45f"],
    ["#2a283f", "#455f8d", "#56c7a3"],
    ["#172433", "#5a4772", "#e06f5a"],
    ["#28351f", "#5f6f42", "#d9c56e"],
    ["#221f2f", "#366b6f", "#f0a05d"],
  ];
  const index = [...String(seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;
  const [a, b, c] = palettes[index];
  return `radial-gradient(circle at 22% 18%, ${c} 0 0.5rem, transparent 0.55rem), linear-gradient(135deg, ${a}, ${b} 58%, ${c})`;
}

function safeCssImage(value, fallbackSeed) {
  const text = String(value || "").trim();
  if (/^url\(['"]?\/assets\/images\/games\//.test(text)) return text;
  return artGradient(fallbackSeed);
}

function safeImagePath(value) {
  const text = String(value || "").trim();
  return text.startsWith("/assets/images/games/") ? text : "";
}

async function initHome() {
  const grid = document.querySelector("#maps");
  if (!grid) return;

  const buttons = document.querySelectorAll(".filter-button");
  const searchForm = document.querySelector(".search-panel");
  const searchInput = document.querySelector("#game-search");
  const statCards = document.querySelectorAll(".stats article");
  let activeFilter = "all";
  let query = "";

  try {
    const syncedGames = await fetch("/data/site-games.json").then((response) => response.json());
    if (Array.isArray(syncedGames) && syncedGames.length) games = syncedGames;
  } catch {
    // Keep the bundled fallback list if the synced data file cannot be loaded.
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function updateStats() {
    const totalMaps = games.reduce((sum, game) => sum + Number(game.maps || 0), 0);
    const totalMarkers = games.reduce((sum, game) => sum + Number(game.markerCount || 0), 0);
    const values = [
      [games.length, "Games"],
      [totalMaps, "Area maps"],
      [totalMarkers, "Synced markers"],
      [games.length, "Map sites"],
    ];
    statCards.forEach((card, index) => {
      const [value, label] = values[index] || [0, ""];
      const strong = card.querySelector("strong");
      const span = card.querySelector("span");
      if (strong) strong.textContent = formatNumber(value);
      if (span) span.textContent = label;
    });
  }

  function filteredGames() {
    return games
      .filter((game) => {
        if (activeFilter === "updated") return game.updated;
        return true;
      })
      .filter((game) => game.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (activeFilter === "az") return a.title.localeCompare(b.title);
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || b.maps - a.maps;
      });
  }

  function render() {
    const items = filteredGames();
    grid.innerHTML = items
      .map(
        (game) => `
          <a class="game-card" href="${game.href}">
            <div class="game-art" style="--art: ${safeCssImage(game.art, game.title)}">
              ${game.updated ? '<span class="updated-badge">New data</span>' : ""}
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.title)}</h3>
              <div class="game-meta">${game.maps} maps - ${formatNumber(game.markerCount)} markers</div>
              <div class="capabilities">
                <span class="capability">Marker list</span>
              </div>
            </div>
          </a>
        `,
      )
      .join("");

    if (!items.length) grid.innerHTML = '<p class="empty-state">No matching maps found.</p>';
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      buttons.forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      render();
    });
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    query = searchInput.value.trim();
    render();
  });
  searchInput?.addEventListener("input", () => {
    query = searchInput.value.trim();
    render();
  });

  updateStats();
  render();
}

async function initOutboundList() {
  const list = document.querySelector("#outbound-map-list, [data-map-list]");
  if (!list) return;

  const data = await fetch(list.dataset.source || "/data/outbound.json").then((response) => response.json());
  const basePath = list.dataset.basePath || "/maps/outbound";
  const title = data.title || "Outbound";
  list.innerHTML = data.maps
    .map((map) => {
      const imagePath = safeImagePath(map.thumbnailUrl);
      return `
        <a class="map-card" href="${basePath}/${map.slug}/">
          <div class="map-card-art" style="--art: ${safeCssImage(imagePath ? `url('${imagePath}')` : "", `${title}-${map.name}`)}">
            ${imagePath ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(map.name)} ${escapeHtml(title)} marker map" />` : ""}
          </div>
          <div class="map-card-body">
            <h3>${escapeHtml(displayText(map.name, "Map"))} <span aria-hidden="true">?</span></h3>
            <div class="map-card-meta">${escapeHtml(title)} marker map</div>
            <div class="capabilities">
              <span class="capability">Locations</span>
            </div>
          </div>
        </a>
      `;
    })
    .join("");
}

async function initOutboundDetail() {
  const root = document.querySelector('[data-page="outbound-detail"], [data-page="map-detail"]');
  if (!root) return;

  const dataUrl = root.dataset.mapData || "/data/outbound-the-outdoors.json";
  const tileKey = root.dataset.tileKey || "outbound/the-outdoors";
  const tilePath = root.dataset.tilePath || `/tiles/${tileKey}`;
  const data = await fetch(dataUrl).then((response) => response.json());
  let remoteTileSource = null;
  try {
    const tileSources = await fetch("/data/tile-sources.json").then((response) => response.json());
    remoteTileSource = tileSources[tileKey] || null;
  } catch {
    remoteTileSource = null;
  }
  const { metadata, features } = data;
  const categories = Array.isArray(metadata.categories) ? metadata.categories : [];
  const subcategories = Array.isArray(metadata.subcategories) ? metadata.subcategories : [];
  const categoryById = Object.fromEntries(categories.map((category) => [category.externalId, category]));
  const subcategoryById = Object.fromEntries(subcategories.map((subcategory) => [subcategory.externalId, subcategory]));
  const subcategoryCounts = new Map();
  const visibleSubcategories = new Set();
  const markerElements = new Map();

  const viewport = document.querySelector("#tile-viewport");
  const canvas = document.querySelector("#tile-canvas");
  const surface = document.querySelector("#tile-surface");
  const categoryList = document.querySelector("#category-list");
  const detail = document.querySelector("#marker-detail");
  const markerCount = document.querySelector("#marker-count");
  const search = document.querySelector("#marker-search");
  const markerResults = document.querySelector("#marker-results");
  const ctx = canvas.getContext("2d");

  const tileZoom = Number(root.dataset.tileZoom || metadata.maxZoom || 3);
  const minTileZoom = Number(metadata.minZoom || 0);
  const tileSize = 256;
  const tileCount = 2 ** tileZoom;
  const mapSize = tileSize * tileCount;
  surface.style.width = `${mapSize}px`;
  surface.style.height = `${mapSize}px`;
  const tileCache = new Map();
  let scale = 0.78;
  let panX = 0;
  let panY = 0;
  let query = "";
  let selectedIndex = 0;
  let dragStart = null;
  let drawToken = 0;
  let tileRedrawPending = false;
  const minScale = 0.16;
  const maxScale = 2.4;

  const iconByName = {
    "broadcast-tower": "tower",
    campfire: "campfire",
    "chart-pyramid": "pyramid",
    "roundies:architecture-bridge": "bridge",
    archway: "archway",
    "roundies:energy-care-for-water": "water",
    "roundies:architecture-house": "house",
    "roundies:architecture-wheelbarrow": "cart",
    "box-alt": "box",
    "roundies:energy-plant": "shrub",
    "roundies:energy-trash-plant": "trash",
    "roundies:energy-tree": "log",
    "roundies:food-blueberries": "berries",
    "roundies:architecture-pick-axe": "pickaxe",
    "roundies:business-and-finance-target-coins": "coins",
    carrot: "carrot",
    "material:grass": "grass",
    "roundies:food-mushroom": "mushroom",
    "flower-tulip": "flower",
    "map-marker-smile": "gnome",
    "paint-roller": "roller",
    "roundies:energy-solar-planet": "food",
    "roundies:home-interior-clothing-hanger": "hanger",
    "roundies:maternity-fruit": "fruit",
    "material:panorama_fish_eye": "circle",
    "coffee-beans": "beans",
    "roundies:home-equipment-plant-seven": "plant",
    question: "question",
    "usb-pendrive": "key",
    alien: "alien",
    "battery-bolt": "battery",
    bolt: "bolt",
    biohazard: "biohazard",
    "book-atlas": "book",
    "box-fragile": "box",
    "box-open": "box",
    "box-open-full": "box",
    bug: "bug",
    building: "house",
    butterfly: "butterfly",
    cube: "cube",
    database: "database",
    diamond: "gem",
    egg: "egg",
    "file-image": "document",
    "flask-poison": "flask",
    gem: "gem",
    hexagon: "hexagon",
    "house-building": "house",
    "landmark-alt": "pyramid",
    leaf: "plant",
    "life-ring": "ring",
    "material:bubble_chart": "bubbles",
    "material:electric_bolt": "bolt",
    "material:scan": "scan",
    "material:weight": "weight",
    poop: "hazard",
    "puzzle-piece": "puzzle",
    radar: "radar",
    "roundies:animals-crab": "crab",
    "roundies:animals-fish": "fish",
    "roundies:animals-jellyfish": "jellyfish",
    "roundies:animals-shark": "shark",
    "roundies:animals-worm": "worm",
    "roundies:architecture-blueprints": "document",
    "roundies:business-and-finance-gold": "coins",
    "roundies:home-equipment-flower": "flower",
    "salt-pepper": "resource",
    ship: "ship",
    shrimp: "crab",
    "signal-stream": "signal",
    "temperature-high": "temperature",
    terminal: "terminal",
    "tool-box": "box",
    "triangle-warning": "warning",
    acorn: "fruit",
    angel: "gnome",
    "arrow-alt-square-up": "signal",
    "arrow-alt-up": "signal",
    "arrow-right-to-bracket": "key",
    bacterium: "biohazard",
    "balance-scale": "weight",
    bank: "pyramid",
    "battery-empty": "battery",
    bell: "signal",
    "book-open-cover": "book",
    "bow-arrow": "key",
    box: "box",
    "car-battery": "battery",
    "cart-shopping-fast": "cart",
    castle: "house",
    "chalkboard-user": "document",
    "chess-piece": "pyramid",
    "circle-r": "circle",
    "clipboard-list": "document",
    crown: "pyramid",
    "diamond-exclamation": "gem",
    "dice-d6": "cube",
    dungeon: "archway",
    entertainment: "star",
    fence: "bridge",
    fish: "fish",
    football: "circle",
    ghost: "gnome",
    "hammer-crash": "pickaxe",
    "hand-back-fist": "key",
    "hand-scissors": "key",
    handshake: "key",
    lemon: "fruit",
    marker: "pin",
    "material:add_diamond": "gem",
    "material:apparel": "hanger",
    "material:arrow_circle_down": "signal",
    "material:book_5": "book",
    "material:business_center": "box",
    "material:cell_tower": "tower",
    "material:computer": "terminal",
    "material:diamond": "gem",
    "material:diamond_shine": "gem",
    "material:door_sliding": "archway",
    "material:folded_hands": "gnome",
    "material:handshake": "key",
    "material:home_storage": "box",
    "material:indeterminate_check_box": "box",
    "material:iron": "pickaxe",
    "material:keyboard_return": "key",
    "material:map_search": "radar",
    "material:medical_services": "flask",
    "material:memory": "database",
    "material:person_celebrate": "gnome",
    "material:potted_plant": "plant",
    "material:radio_button_checked": "circle",
    "material:robot_2": "alien",
    "material:rocket": "ship",
    "material:sell": "coins",
    "material:settings_input_antenna": "signal",
    "material:sim_card": "database",
    "material:skull": "hazard",
    "material:stress_management": "flower",
    "material:swords": "key",
    "material:temple_buddhist": "pyramid",
    "material:text_select_move_down": "document",
    "material:train": "cart",
    "material:vpn_key": "key",
    "material:water_drop": "water",
    "material:water_lock": "water",
    "material:waving_hand": "gnome",
    meat: "food",
    medicine: "flask",
    monument: "pyramid",
    mushroom: "mushroom",
    "olive-oil": "food",
    olives: "berries",
    "paper-plane-top": "ship",
    paw: "bug",
    "person-praying": "gnome",
    "person-simple": "gnome",
    pot: "box",
    "rings-wedding": "ring",
    "roundies:airport-and-hotels-bed": "house",
    "roundies:airport-and-hotels-elevator": "archway",
    "roundies:airport-and-hotels-room-key": "key",
    "roundies:airport-and-hotels-weapon-case": "box",
    "roundies:animals-ant": "bug",
    "roundies:animals-bee": "bug",
    "roundies:animals-beetle": "bug",
    "roundies:animals-cat_1": "bug",
    "roundies:animals-dog_1": "bug",
    "roundies:animals-goat": "bug",
    "roundies:animals-horse": "bug",
    "roundies:animals-horse_1": "bug",
    "roundies:animals-poop": "hazard",
    "roundies:animals-unicorn": "bug",
    "roundies:animals-wolf": "bug",
    "roundies:architecture-brush": "roller",
    "roundies:architecture-igloo": "house",
    "roundies:architecture-paint-brush": "roller",
    "roundies:business-and-finance-coin-exchange": "coins",
    "roundies:business-and-finance-diamond": "gem",
    "roundies:business-and-finance-exchange-money": "coins",
    "roundies:business-and-finance-shop": "cart",
    "roundies:business-and-finance-shop-store": "cart",
    "roundies:business-and-finance-shopping-kart": "cart",
    "roundies:business-and-finance-toolbox": "box",
    "roundies:emoji-alien": "alien",
    "roundies:emoji-angry-devil": "hazard",
    "roundies:emoji-happy-cat": "bug",
    "roundies:emoji-happy-devil": "hazard",
    "roundies:energy-leaves-and-plant": "plant",
    "roundies:energy-science": "flask",
    "roundies:filetypes-keyhole-file": "document",
    "roundies:food-cauliflower": "carrot",
    "roundies:food-exotic-fruit": "fruit",
    "roundies:food-lollipop": "food",
    "roundies:food-pear": "fruit",
    "roundies:food-star": "food",
    "roundies:food-sushi-triangle": "food",
    "roundies:food-vegetable": "carrot",
    "roundies:games-and-sports-bow-and-arrow": "key",
    "roundies:games-and-sports-horse": "bug",
    "roundies:games-and-sports-shield": "pyramid",
    "roundies:games-and-sports-sword": "key",
    "roundies:games-and-sports-three-arrow-up": "signal",
    "roundies:games-and-sports-throwing-star": "star",
    "roundies:games-and-sports-tower": "tower",
    "roundies:games-and-sports-wizard-hat": "gnome",
    "roundies:home-equipment-plant-five": "plant",
    "roundies:home-equipment-plate": "food",
    "roundies:home-equipment-pot-two": "box",
    "roundies:home-interior-dining-table-four": "food",
    "roundies:internet-security-secret": "question",
    "roundies:internet-security-tablet-lock": "database",
    "roundies:maternity-rocking-horse": "bug",
    "roundies:transportation-car-battery": "battery",
    "roundies:transportation-car-vehicle": "cart",
    "roundies:transportation-ufo": "ship",
    "roundies:world-monuments-tower-landmark": "tower",
    scissors: "key",
    "shopping-cart": "cart",
    "skull-crossbones": "hazard",
    spade: "plant",
    "spaghetti-monster-flying": "alien",
    "star-christmas": "star",
    "street-view": "gnome",
    sun: "circle",
    sword: "key",
    "time-past": "circle",
    tire: "circle",
    "treasure-chest": "box",
    "uniform-martial-arts": "hanger",
    "user-robot": "alien",
    "warehouse-alt": "house",
    wheat: "grass",
  };

  features.forEach((feature) => {
    const id = feature.properties.subcategoryExternalId;
    subcategoryCounts.set(id, (subcategoryCounts.get(id) || 0) + 1);
    const subcategory = subcategoryById[id];
    const category = categoryById[subcategory?.categoryExternalId];
    if (category?.visibleByDefault) visibleSubcategories.add(id);
  });

  function iconFor(subcategory) {
    const original = subcategory?.icon || "";
    if (iconByName[original]) return iconByName[original];

    const name = String(original).toLowerCase();
    if (!name) return "pin";
    if (name.includes("fish")) return "fish";
    if (name.includes("jelly")) return "jellyfish";
    if (name.includes("shark")) return "shark";
    if (name.includes("crab") || name.includes("shrimp")) return "crab";
    if (name.includes("bug") || name.includes("bee") || name.includes("beetle") || name.includes("ant")) return "bug";
    if (name.includes("animal") || name.includes("wolf") || name.includes("horse") || name.includes("dog") || name.includes("cat") || name.includes("paw")) return "bug";
    if (name.includes("camp") || name.includes("fire")) return "campfire";
    if (name.includes("tower") || name.includes("antenna") || name.includes("broadcast")) return "tower";
    if (name.includes("bridge") || name.includes("fence")) return "bridge";
    if (name.includes("cave") || name.includes("door") || name.includes("dungeon") || name.includes("entrance")) return "archway";
    if (name.includes("house") || name.includes("home") || name.includes("building") || name.includes("base") || name.includes("castle")) return "house";
    if (name.includes("cart") || name.includes("shop") || name.includes("merchant") || name.includes("train") || name.includes("car") || name.includes("vehicle")) return "cart";
    if (name.includes("chest") || name.includes("crate") || name.includes("box") || name.includes("case") || name.includes("tool")) return "box";
    if (name.includes("coin") || name.includes("money") || name.includes("gold") || name.includes("sell")) return "coins";
    if (name.includes("diamond") || name.includes("gem")) return "gem";
    if (name.includes("water") || name.includes("drop")) return "water";
    if (name.includes("plant") || name.includes("leaf") || name.includes("tree") || name.includes("flower")) return "plant";
    if (name.includes("mushroom")) return "mushroom";
    if (name.includes("grass") || name.includes("wheat")) return "grass";
    if (name.includes("food") || name.includes("meat") || name.includes("fruit") || name.includes("meal") || name.includes("plate")) return "food";
    if (name.includes("book") || name.includes("file") || name.includes("note") || name.includes("document") || name.includes("clipboard")) return "document";
    if (name.includes("scan") || name.includes("radar") || name.includes("map") || name.includes("search")) return "radar";
    if (name.includes("battery") || name.includes("electric")) return "battery";
    if (name.includes("bolt") || name.includes("power")) return "bolt";
    if (name.includes("ship") || name.includes("plane") || name.includes("rocket") || name.includes("ufo")) return "ship";
    if (name.includes("key") || name.includes("sword") || name.includes("weapon") || name.includes("bow") || name.includes("gun")) return "key";
    if (name.includes("skull") || name.includes("hazard") || name.includes("poison") || name.includes("danger")) return "hazard";
    if (name.includes("warning") || name.includes("exclamation")) return "warning";
    if (name.includes("secret") || name.includes("question") || name.includes("unknown")) return "question";
    if (name.includes("alien") || name.includes("robot")) return "alien";
    if (name.includes("ring")) return "ring";
    if (name.includes("circle") || name.includes("ball")) return "circle";
    if (name.includes("star")) return "star";
    if (name.includes("cube") || name.includes("dice")) return "cube";
    return "pin";
  }

  function iconMarkup(subcategory) {
    return `<span class="common-icon common-icon--${iconFor(subcategory)}" aria-hidden="true"></span>`;
  }

  function markerLabel(feature) {
    const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
    return displayText(feature.properties.title, displayText(subcategory?.title, "Map Marker"));
  }

  function project([lng, lat]) {
    const limitedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
    const sin = Math.sin((limitedLat * Math.PI) / 180);
    return {
      x: ((lng + 180) / 360) * mapSize,
      y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * mapSize,
    };
  }

  function resizeCanvas() {
    const rect = viewport.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  function requestTileRedraw() {
    if (tileRedrawPending) return;
    tileRedrawPending = true;
    window.setTimeout(() => {
      tileRedrawPending = false;
      drawTiles();
    }, 0);
  }

  function loadTileAt(z, x, y) {
    const count = 2 ** z;
    if (x < 0 || x >= count || y < 0 || y >= count) return null;
    const key = `${z}/${x}/${y}`;
    if (tileCache.has(key)) return tileCache.get(key);
    const record = { image: null, bitmap: null, failed: false };
    let sourceZ = z;
    let sourceX = x;
    let sourceY = y;
    if (remoteTileSource && sourceZ > remoteTileSource.maxZoom) {
      const factor = 2 ** (sourceZ - remoteTileSource.maxZoom);
      sourceX = Math.floor(sourceX / factor);
      sourceY = Math.floor(sourceY / factor);
      sourceZ = remoteTileSource.maxZoom;
    }
    const upstreamY = remoteTileSource?.tmsEnabled ? 2 ** sourceZ - 1 - sourceY : sourceY;
    const src = remoteTileSource
      ? remoteTileSource.tmsEnabled
        ? `${remoteTileSource.base}/${sourceZ}/${sourceX}/${upstreamY}.webp`
        : `${remoteTileSource.base}/${sourceZ}/${upstreamY}/${sourceX}.webp`
      : `${tilePath}/${z}/${x}/${y}.webp?v=progressive-tiles`;

    const markFailed = () => {
      record.failed = true;
      window.setTimeout(() => tileCache.delete(key), 5000);
    };

    const loadWithImage = (imageSrc = src, onDone = () => {}) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        record.image = image;
        onDone();
        requestTileRedraw();
      };
      image.onerror = () => {
        onDone();
        markFailed();
      };
      image.src = imageSrc;
    };

    if (window.fetch) {
      fetch(src)
        .then((response) => {
          if (!response.ok) throw new Error(`Tile ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          if (window.createImageBitmap) {
            return createImageBitmap(blob).then((bitmap) => {
              record.bitmap = bitmap;
              requestTileRedraw();
            });
          }
          const objectUrl = URL.createObjectURL(blob);
          loadWithImage(objectUrl, () => URL.revokeObjectURL(objectUrl));
        })
        .catch(() => loadWithImage());
    } else {
      loadWithImage();
    }

    tileCache.set(key, record);
    return record;
  }

  function loadTile(x, y) {
    return loadTileAt(tileZoom, x, y);
  }

  function drawLoadedAncestor(x, y, dx, dy, size) {
    for (let z = tileZoom - 1; z >= minTileZoom; z -= 1) {
      const factor = 2 ** (tileZoom - z);
      const parentX = Math.floor(x / factor);
      const parentY = Math.floor(y / factor);
      const record = loadTileAt(z, parentX, parentY);
      const tileImage = record?.bitmap || record?.image;
      if (!tileImage) continue;

      const childX = x % factor;
      const childY = y % factor;
      const sourceSize = tileSize / factor;
      const sx = childX * sourceSize;
      const sy = childY * sourceSize;
      ctx.drawImage(tileImage, sx, sy, sourceSize, sourceSize, dx, dy, size, size);
      return true;
    }
    return false;
  }

  function drawTiles() {
    const token = ++drawToken;
    const { width, height } = resizeCanvas();
    ctx.fillStyle = metadata.backgroundColor || "#bf9b6d";
    ctx.fillRect(0, 0, width, height);

    const minTileX = Math.floor((-panX / scale) / tileSize) - 1;
    const maxTileX = Math.ceil(((width - panX) / scale) / tileSize) + 1;
    const minTileY = Math.floor((-panY / scale) / tileSize) - 1;
    const maxTileY = Math.ceil(((height - panY) / scale) / tileSize) + 1;
    let loaded = 0;
    let requested = 0;
    let failed = 0;

    for (let y = minTileY; y <= maxTileY; y += 1) {
      for (let x = minTileX; x <= maxTileX; x += 1) {
        const record = loadTile(x, y);
        if (!record) continue;
        requested += 1;
        if (record.failed) failed += 1;
        const dx = Math.round(panX + x * tileSize * scale);
        const dy = Math.round(panY + y * tileSize * scale);
        const size = Math.ceil(tileSize * scale) + 1;
        const tileImage = record.bitmap || record.image;
        if (tileImage) {
          loaded += 1;
          ctx.drawImage(tileImage, dx, dy, size, size);
        } else if (drawLoadedAncestor(x, y, dx, dy, size)) {
          loaded += 1;
        }
      }
    }

    if (token !== drawToken) return;

    surface.dataset.loadedTiles = String(loaded);
    surface.dataset.requestedTiles = String(requested);
    surface.dataset.failedTiles = String(failed);
  }

  function applyTransform() {
    surface.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    surface.style.setProperty("--marker-scale", String(1 / scale));
    drawTiles();
  }

  function zoomTo(nextScale, anchorX, anchorY) {
    const beforeX = (anchorX - panX) / scale;
    const beforeY = (anchorY - panY) / scale;
    scale = clamp(nextScale, minScale, maxScale);
    panX = anchorX - beforeX * scale;
    panY = anchorY - beforeY * scale;
    applyTransform();
  }

  function resetMap() {
    const rect = viewport.getBoundingClientRect();
    const panel = document.querySelector(".map-control-panel")?.getBoundingClientRect();
    const focusX = rect.width <= 640 && panel ? panel.width + (rect.width - panel.width) * 0.52 : rect.width * 0.5;
    const focusY = rect.height * 0.52;
    const target = initialFocusPoint();
    scale = rect.width <= 640 ? 0.82 : 0.9;
    panX = focusX - target.x * scale;
    panY = focusY - target.y * scale;
    applyTransform();
  }

  function initialFocusPoint() {
    const visibleFeatures = features.filter((feature) => visibleSubcategories.has(feature.properties.subcategoryExternalId));
    const source = visibleFeatures.length ? visibleFeatures : features;
    const points = source.map((feature) => project(feature.coordinates));
    const xs = points.map((point) => point.x).sort((a, b) => a - b);
    const ys = points.map((point) => point.y).sort((a, b) => a - b);
    return {
      x: xs[Math.floor(xs.length / 2)] || mapSize / 2,
      y: ys[Math.floor(ys.length / 2)] || mapSize / 2,
    };
  }

  function renderCategories() {
    categoryList.innerHTML = categories
      .map((category) => {
        const subs = subcategories.filter((subcategory) => subcategory.categoryExternalId === category.externalId);
        const count = subs.reduce((sum, subcategory) => sum + (subcategoryCounts.get(subcategory.externalId) || 0), 0);
        return `
          <section class="category-group">
            <button class="category-head" type="button" data-category="${category.externalId}" style="--dot: ${category.color}">
              <span class="filter-label">
                <input class="native-checkbox" type="checkbox" checked tabindex="-1" aria-hidden="true" />
                <span class="fake-checkbox" aria-hidden="true"></span>
                <span class="category-dot"></span>
                <span>${escapeHtml(displayText(category.title, "Category"))}</span>
              </span>
              <span class="category-count">${count}</span>
            </button>
            ${subs
              .map(
                (subcategory) => `
                  <button class="subcategory-row" type="button" data-subcategory="${subcategory.externalId}" style="--dot: ${category.color}">
                    <input class="native-checkbox" type="checkbox" checked tabindex="-1" aria-hidden="true" />
                    <span class="fake-checkbox" aria-hidden="true"></span>
                    <span class="subcategory-icon">${iconMarkup(subcategory)}</span>
                    <span>${escapeHtml(displayText(subcategory.title, "Marker Type"))}</span>
                    <span class="subcategory-count">${subcategoryCounts.get(subcategory.externalId) || 0}</span>
                  </button>
                `,
              )
              .join("")}
          </section>
        `;
      })
      .join("");

    categoryList.querySelectorAll("[data-subcategory]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.subcategory;
        if (visibleSubcategories.has(id)) visibleSubcategories.delete(id);
        else visibleSubcategories.add(id);
        updateVisibility();
      });
    });

    categoryList.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        const subs = subcategories.filter((subcategory) => subcategory.categoryExternalId === button.dataset.category);
        const allVisible = subs.every((subcategory) => visibleSubcategories.has(subcategory.externalId));
        subs.forEach((subcategory) => {
          if (allVisible) visibleSubcategories.delete(subcategory.externalId);
          else visibleSubcategories.add(subcategory.externalId);
        });
        updateVisibility();
      });
    });
  }

  function renderMarkers() {
    surface.innerHTML = "";
    markerElements.clear();
    features.forEach((feature, index) => {
      const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
      const category = categoryById[subcategory?.categoryExternalId];
      const point = project(feature.coordinates);
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "map-marker";
      marker.style.left = `${point.x}px`;
      marker.style.top = `${point.y}px`;
      marker.style.setProperty("--dot", category?.color || "#39e6a9");
      marker.innerHTML = iconMarkup(subcategory);
      marker.title = markerLabel(feature);
      marker.setAttribute("aria-label", markerLabel(feature));
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        selectMarker(index);
      });
      surface.append(marker);
      markerElements.set(index, marker);
    });
  }

  function featureMatchesQuery(feature) {
    if (!query) return true;
    const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
    const category = categoryById[subcategory?.categoryExternalId];
    const text = [
      markerLabel(feature),
      displayText(feature.properties.description, ""),
      displayText(subcategory?.title, ""),
      displayText(category?.title, ""),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(query);
  }

  function updateVisibility() {
    let visible = 0;
    const matches = [];
    features.forEach((feature, index) => {
      const isVisible = visibleSubcategories.has(feature.properties.subcategoryExternalId) && featureMatchesQuery(feature);
      markerElements.get(index)?.classList.toggle("is-hidden", !isVisible);
      if (isVisible) {
        visible += 1;
        matches.push(index);
      }
    });

    categoryList.querySelectorAll("[data-subcategory]").forEach((button) => {
      const isVisible = visibleSubcategories.has(button.dataset.subcategory);
      button.classList.toggle("is-off", !isVisible);
      const checkbox = button.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = isVisible;
    });

    categoryList.querySelectorAll("[data-category]").forEach((button) => {
      const subs = subcategories.filter((subcategory) => subcategory.categoryExternalId === button.dataset.category);
      const isVisible = subs.some((subcategory) => visibleSubcategories.has(subcategory.externalId));
      button.classList.toggle("is-off", !isVisible);
      const checkbox = button.querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.checked = isVisible;
    });

    markerCount.textContent = `${visible} / ${features.length} markers`;
    renderSearchResults(matches);
  }

  function centerOnFeature(feature) {
    const rect = viewport.getBoundingClientRect();
    const point = project(feature.coordinates);
    panX = rect.width * 0.52 - point.x * scale;
    panY = rect.height * 0.5 - point.y * scale;
    applyTransform();
  }

  function renderSearchResults(matches) {
    if (!markerResults) return;
    if (!query) {
      markerResults.innerHTML = '<p class="marker-results-hint">Search for markers by name or category.</p>';
      return;
    }
    if (!matches.length) {
      markerResults.innerHTML = '<p class="marker-results-hint">No markers found. Try another search or enable more categories.</p>';
      return;
    }

    markerResults.innerHTML = matches
      .slice(0, 40)
      .map((index) => {
        const feature = features[index];
        const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
        const category = categoryById[subcategory?.categoryExternalId];
        return `
          <button class="marker-result" type="button" data-marker-index="${index}">
            <span class="marker-result-icon" style="--dot: ${category?.color || "#39e6a9"}">${iconMarkup(subcategory)}</span>
            <span>
              <strong>${escapeHtml(markerLabel(feature))}</strong>
              <small>${escapeHtml(displayText(category?.title, "Category"))} / ${escapeHtml(displayText(subcategory?.title, "Marker Type"))}</small>
            </span>
          </button>
        `;
      })
      .join("");

    markerResults.querySelectorAll("[data-marker-index]").forEach((button) => {
      button.addEventListener("click", () => selectMarker(Number(button.dataset.markerIndex), true));
    });
  }

  function selectMarker(index, shouldCenter = false) {
    const feature = features[index];
    if (!feature) return;
    selectedIndex = index;
    const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
    const category = categoryById[subcategory?.categoryExternalId];
    markerElements.forEach((marker, markerIndex) => {
      marker.classList.toggle("is-selected", markerIndex === selectedIndex);
    });
    detail.innerHTML = `
      <span>${escapeHtml(displayText(category?.title, "Category"))} / ${escapeHtml(displayText(subcategory?.title, "Marker Type"))}</span>
      <strong><span class="detail-icon" style="--dot: ${category?.color || "#39e6a9"}">${iconMarkup(subcategory)}</span>${escapeHtml(markerLabel(feature))}</strong>
      <p>${escapeHtml(displayText(feature.properties.description, "No extra description is available for this marker.")).replace(/\n/g, "<br>")}</p>
    `;
    if (shouldCenter) centerOnFeature(feature);
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".map-marker")) return;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("is-dragging");
    dragStart = { x: event.clientX, y: event.clientY, panX, panY };
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    panX = dragStart.panX + event.clientX - dragStart.x;
    panY = dragStart.panY + event.clientY - dragStart.y;
    applyTransform();
  });

  viewport.addEventListener("pointerup", () => {
    dragStart = null;
    viewport.classList.remove("is-dragging");
  });

  viewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    zoomTo(scale * (event.deltaY > 0 ? 0.88 : 1.12), pointerX, pointerY);
  }, { passive: false });

  document.querySelector("#zoom-in")?.addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomTo(scale * 1.2, rect.width / 2, rect.height / 2);
  });
  document.querySelector("#zoom-out")?.addEventListener("click", () => {
    const rect = viewport.getBoundingClientRect();
    zoomTo(scale / 1.2, rect.width / 2, rect.height / 2);
  });
  document.querySelector("#reset-map")?.addEventListener("click", resetMap);
  search?.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    updateVisibility();
  });
  document.querySelector("#show-all-markers")?.addEventListener("click", () => {
    subcategories.forEach((subcategory) => visibleSubcategories.add(subcategory.externalId));
    updateVisibility();
  });
  document.querySelector("#hide-all-markers")?.addEventListener("click", () => {
    visibleSubcategories.clear();
    updateVisibility();
  });
  window.addEventListener("resize", resetMap);

  renderCategories();
  renderMarkers();
  resetMap();
  updateVisibility();
  selectMarker(0);
}

initHome();
initOutboundList();
initOutboundDetail();
