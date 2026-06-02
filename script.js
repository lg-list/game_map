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
  return /[\ufffd]/.test(text) || /(?:\u951f|\u8119|\u8117|\u6c13|\u5fd9|\u83bd|\u732b|\u8305|\u679a)/.test(text);
}

function hasCjkText(value) {
  return /[\u3400-\u9fff]/.test(String(value ?? ""));
}

const englishTextMap = new Map([
  ["\u5174\u8da3\u70b9", "Points of Interest"],
  ["\u6218\u5229\u54c1", "Loot"],
  ["\u81ea\u7136\u8d44\u6e90", "Natural Resources"],
  ["\u8d44\u6e90", "Resources"],
  ["\u4efb\u52a1", "Quests"],
  ["\u5f27\u5f62\u533a\u57df", "ARC Zones"],
  ["\u8403\u53d6\u70b9", "Extraction Points"],
  ["ARC\u6218\u5229\u54c1", "ARC Loot"],
  ["\u5730\u56fe\u4e8b\u4ef6", "Map Events"],
  ["\u5730\u70b9", "Locations"],
  ["\u6536\u85cf\u54c1", "Collectibles"],
  ["\u6742\u9879", "Misc"],
  ["\u5176\u4ed6", "Other"],
  ["\u73a9\u5bb6\u51fa\u751f\u70b9", "Player Spawn"],
  ["\u8865\u7ed9\u547c\u53eb\u7ad9", "Supply Call Station"],
  ["\u91ce\u6218\u8865\u7ed9\u7ad9", "Field Supply Station"],
  ["\u91ce\u5916\u7bb1\u5b50", "Field Crate"],
  ["\u4e0a\u9501\u7684\u95e8", "Locked Door"],
  ["\u6b66\u5668\u7bb1", "Weapon Case"],
  ["\u533b\u7597\u5305", "Medical Kit"],
  ["\u5f39\u836f\u7bb1", "Ammo Box"],
  ["\u7a81\u88ad\u8005\u5b9d\u7bb1", "Raider Cache"],
  ["\u8f7d\u5177", "Vehicle"],
  ["\u5b89\u5168\u50a8\u7269\u67dc", "Security Locker"],
  ["\u8611\u83c7", "Mushroom"],
  ["\u5927\u6bdb\u854a\u82b1", "Great Mullein"],
  ["\u523a\u68a8\u679c", "Prickly Pear"],
  ["\u9f99\u820c\u5170", "Agave"],
  ["\u674f\u5b50", "Apricot"],
  ["\u82d4\u85d3", "Moss"],
  ["\u80a5\u6599", "Fertilizer"],
  ["\u6839\u830e", "Root"],
  ["\u76ee\u6807", "Objective"],
  ["\u5927\u578bARC", "Large ARC"],
  ["\u4e2d\u578bARC", "Medium ARC"],
  ["\u5c0f\u578bARC", "Small ARC"],
  ["\u7a81\u88ad\u8005\u8231\u95e8", "Raider Hatch"],
  ["\u64a4\u79bb\u70b9", "Extraction Point"],
  ["ARC \u4fe1\u4f7f", "ARC Courier"],
  ["ARC\u63a2\u6d4b\u5668", "ARC Probe"],
  ["\u7537\u7235\u5916\u58f3", "Baron Husk"],
  ["ARC\u5916\u58f3", "ARC Husk"],
  ["\u6536\u5272\u8005", "Harvester"],
  ["\u4fe1\u53f7\u5854", "Signal Tower"],
  ["\u7bdd\u706b", "Campfire"],
  ["\u77f3\u5806", "Rock Pile"],
  ["\u6865\u6881", "Bridge"],
  ["\u6c34\u4e95", "Water Well"],
  ["\u5730\u6807", "Landmark"],
  ["\u91d1\u5c5e\u5e9f\u6599", "Metal Scrap"],
  ["\u8865\u7ed9\u7bb1", "Supply Box"],
  ["\u704c\u6728\u4e1b", "Bush"],
  ["\u5783\u573e", "Trash"],
  ["\u6728\u6750\u539f\u6728", "Wood Log"],
  ["\u6d46\u679c\u704c\u6728", "Berry Bush"],
  ["\u5ca9\u77f3", "Rock"],
  ["\u74f6\u76d6", "Bottle Cap"],
  ["\u6839\u830e\u4f5c\u7269", "Root Crop"],
  ["\u82a6\u82c7", "Reeds"],
  ["\u82b1\u74e3", "Petals"],
  ["\u82b1\u56ed\u5c0f\u77ee\u4eba", "Garden Gnome"],
  ["\u7ed8\u753b\u4f5c\u54c1", "Painting"],
  ["\u5173\u952e\u7269\u54c1", "Key Item"],
  ["ARC \u5feb\u9012\u5458", "ARC Courier"],
  ["ARC \u6218\u5229\u54c1", "ARC Loot"],
  ["ARC\u5feb\u9012\u5458", "ARC Courier"],
  ["\u4e2d\u7b49ARC", "Medium ARC"],
  ["\u4e2d\u7b49\u65b9\u821f", "Medium ARC"],
  ["\u4ed9\u4eba\u638c\u679c", "Prickly Pear"],
  ["\u5316\u80a5", "Fertilizer"],
  ["\u5730\u94c1\u7ad9", "Metro Station"],
  ["\u5927\u578b\u65b9\u821f", "Large ARC"],
  ["\u5929\u7ebf", "Antenna"],
  ["\u5f00\u91c7\u70b9", "Mining Point"],
  ["\u5f27\u5149\u4fe1\u4f7f", "ARC Courier"],
  ["\u5f27\u5149\u63a2\u6d4b\u5668", "ARC Probe"],
  ["\u5f27\u5f62", "ARC Zones"],
  ["\u5f27\u5f62\u533a", "ARC Zones"],
  ["\u6218\u5229\u54c1\u5bb9\u5668", "Loot Container"],
  ["\u6309\u94ae", "Button"],
  ["\u63a0\u593a\u8005\u5b9d\u7bb1", "Raider Cache"],
  ["\u63a0\u593a\u8005\u8231\u53e3", "Raider Hatch"],
  ["\u63a0\u593a\u8005\u8231\u95e8", "Raider Hatch"],
  ["\u63d0\u53d6", "Extraction"],
  ["\u63d0\u53d6\u533a", "Extraction Zone"],
  ["\u63d0\u53d6\u70b9", "Extraction Point"],
  ["\u666f\u70b9", "Points of Interest"],
  ["\u673a\u5668\u4eba", "Robot"],
  ["\u67e0\u6aac", "Lemon"],
  ["\u6a44\u6984", "Olives"],
  ["\u6bdb\u854a\u82b1", "Mullein"],
  ["\u71c3\u6599\u7535\u6c60", "Fuel Cell"],
  ["\u73a9\u5bb6\u91cd\u751f\u70b9", "Player Spawn"],
  ["\u7a81\u88ad\u8005\u8231\u53e3", "Raider Hatch"],
  ["\u91c7\u6398\u573a", "Quarry"],
  ["\u91c7\u6398\u70b9", "Quarry"],
  ["\u91ce\u5916\u8865\u7ed9\u7ad9", "Field Supply Station"],
  ["\u9501\u5b9a\u7684\u95e8", "Locked Door"],
  ["\u9690\u85cf\u63a9\u4f53\u5165\u53e3", "Hidden Bunker Entrance"],
  ["\u91d1\u5408\u6b22\u6811", "Acacia Tree"],
  ["\u739b\u7459", "Agate"],
  ["\u7d2b\u82b1\u82dc\u84ff", "Purple Alfalfa"],
  ["\u94dd\u5c51", "Aluminum Scrap"],
  ["\u94dd", "Aluminum"],
  ["\u52a8\u7269\u9aa8\u9abc", "Animal Bones"],
  ["\u725b\u6cb9\u679c", "Avocado"],
  ["\u9cc4\u68a8", "Avocado"],
  ["\u9e1f\u5de2", "Bird Nest"],
  ["\u82e6\u8c46", "Bitter Bean"],
  ["\u732b\u987b", "Cat's Whiskers"],
  ["\u9676\u74f7\u788e\u7247", "Ceramic Scrap"],
  ["\u9676\u74f7", "Ceramic"],
  ["\u8089\u82c1\u84c9", "Cistanche"],
  ["\u94dc\u5c51", "Copper Scrap"],
  ["\u94dc", "Copper"],
  ["\u9f99\u8840\u6811", "Dragon Blood Tree"],
  ["\u5e72\u71e5\u76d2\u6811", "Dry Boxwood"],
  ["\u5e72\u76d2\u6811", "Dry Boxwood"],
  ["\u654c\u4eba", "Enemies"],
  ["\u7ea4\u7ef4\u788e\u7247", "Fiber Scrap"],
  ["\u7ea4\u7ef4", "Fiber"],
  ["\u9ec4\u91d1", "Gold"],
  ["\u91d1", "Gold"],
  ["\u82b1\u5c97\u5ca9", "Granite"],
  ["\u786c\u77f3", "Hard Stone"],
  ["\u786c\u5ca9\u77f3", "Hard Stone"],
  ["\u5e7b\u5f71\u6811", "Phantom Tree"],
  ["\u9752\u91d1\u77f3", "Lapis Lazuli"],
  ["\u5927\u67af\u6728", "Large Deadwood"],
  ["\u5927\u578b\u67af\u6728", "Large Deadwood"],
  ["\u77f3\u7070\u77f3", "Limestone"],
  ["\u6708\u957f\u77f3", "Moonstone"],
  ["\u5c71\u8537\u8587", "Mountain Rose"],
  ["\u5c71\u8109\u73ab\u7470", "Mountain Rose"],
  ["\u666f\u5929\u79d1\u690d\u7269", "Sedum"],
  ["\u86cb\u767d\u77f3", "Opal"],
  ["\u725b\u81f3", "Oregano"],
  ["\u8fa3\u6912", "Chili Pepper"],
  ["\u5851\u6599\u788e\u7247", "Plastic Scrap"],
  ["\u5851\u6599", "Plastic"],
  ["\u8ff7\u8fed\u9999", "Rosemary"],
  ["\u73ab\u7470\u77f3", "Rose Stone"],
  ["\u73ab\u7470\u5ca9", "Rose Stone"],
  ["\u6a61\u80f6\u5e9f\u6599", "Rubber Scrap"],
  ["\u6a61\u80f6", "Rubber"],
  ["\u829c\u83c1", "Turnip"],
  ["\u874e\u72ee", "Manticore"],
  ["\u8d1d\u7c7b\u8708\u86a3", "Shellipede"],
  ["\u8d1d\u8708\u86a3", "Shellipede"],
  ["\u5251\u9ebb\u6811", "Sisal Tree"],
  ["\u5c16\u6676\u77f3", "Spinel"],
  ["\u77f3\u5934\u5e9f\u6599", "Stone Scrap"],
  ["\u77f3\u5934", "Stone"],
  ["\u786b\u78fa", "Sulfur"],
  ["\u949b\u91d1\u5c5e\u5e9f\u6599", "Titanium Scrap"],
  ["\u949b", "Titanium"],
  ["\u4ea1\u7075\u8349", "Undead Grass"],
  ["\u4e0d\u6b7b\u8349", "Undead Grass"],
  ["\u6728\u5934\u5e9f\u6599", "Wood Scrap"],
  ["\u6728\u6750", "Wood"],
  ["\u9ec4\u85b0\u8863\u8349", "Yellow Lavender"],
  ["\u5b9d\u7bb1", "Treasure Chest"],
  ["\u5f6d\u65af\u57fa", "Pensky"],
  ["\u62f3\u51fb\u6770\u514b", "Boxing Jack"],
  ["\u7279\u91cc\u76ae\u6069", "Tripion"],
  ["\u8df3\u86a4", "Flea"],
  ["\u874c\u86c7", "Viper"],
  ["\u6d1b\u57fa\u6069\u7eb3\u7f57\u5c14", "Rockyenaroll"],
  ["\u672b\u65e5\u8611\u83c7", "Doomshroom"],
  ["\u4f4d\u7f6e", "Locations"],
  ["\u5236\u4f5c", "Crafting"],
  ["\u53ef\u6536\u96c6\u7269\u54c1", "Collectibles"],
  ["\u9635\u8425\u4efb\u52a1", "Faction Quests"],
  ["\u7269\u54c1", "Items"],
  ["\u670d\u52a1", "Services"],
  ["\u5546\u8d29", "Vendors"],
  ["\u8ff7\u4f60\u6e38\u620f", "Minigames"],
  ["\u6df1\u6e0a\u7269\u54c1", "Abyss Items"],
  ["\u6536\u85cf\u54c1", "Collectibles"],
  ["\u636e\u70b9", "Stronghold"],
  ["\u949f", "Bell"],
  ["\u9690\u85cf\u7a7a\u95f4", "Hidden Space"],
  ["\u6df1\u6e0a\u5fbd\u7ae0", "Abyss Badge"],
  ["\u6df1\u6e0a\u67a2\u7ebd", "Abyss Hub"],
  ["\u6d1e\u7a74", "Cave"],
  ["\u7070\u9b03\u795e\u6bbf", "Greymane Temple"],
  ["\u5723\u6240", "Sanctuary"],
  ["\u5c16\u5854", "Spire"],
  ["\u5973\u5deb\u7684\u5de2\u7a74", "Witch's Lair"],
  ["\u9996\u9886", "Boss"],
  ["\u4e16\u754cBoss", "World Boss"],
  ["\u795e\u79d8\u751f\u7269", "Mysterious Creature"],
  ["\u9b54\u6cd5\u751f\u7269", "Magical Creature"],
  ["\u52a8\u7269", "Animal"],
  ["\u6df1\u6e0a\u654c\u4eba", "Abyss Enemy"],
  ["\u7cbe\u82f1\u654c\u4eba", "Elite Enemy"],
  ["\u4e3b\u7ebf\u4efb\u52a1", "Main Quest"],
  ["\u6df1\u6e0a\u795e\u5668", "Abyss Artifact"],
  ["\u5c01\u5370\u6df1\u6e0a\u795e\u5668", "Sealed Abyss Artifact"],
  ["\u94c1\u7827", "Anvil"],
  ["\u914d\u65b9", "Recipe"],
  ["\u7bdd\u706b", "Campfire"],
  ["\u88c5\u5907\u84dd\u56fe", "Equipment Blueprint"],
  ["\u7802\u8f6e", "Grinding Wheel"],
  ["\u7279\u6b8a\u70f9\u996a\u5de5\u5177", "Special Cooking Tool"],
  ["\u77ff\u7269", "Minerals"],
  ["\u8349\u836f", "Herbs"],
  ["\u852c\u83dc", "Vegetables"],
  ["\u6c34\u679c", "Fruit"],
  ["\u8702\u871c", "Honey"],
  ["\u6d77\u8349", "Seaweed"],
  ["\u6606\u866b", "Insect"],
  ["\u6b66\u5668", "Weapon"],
  ["\u836f\u5242", "Potion"],
  ["\u94a5\u5319", "Key"],
  ["\u62a4\u7532", "Armor"],
  ["\u5de5\u5177", "Tools"],
  ["\u67d3\u6599", "Dye"],
  ["\u914d\u9970", "Accessories"],
  ["\u9605\u8bfb\u6750\u6599", "Reading Material"],
  ["\u94f6\u884c", "Bank"],
  ["\u516c\u544a\u677f", "Notice Board"],
  ["\u94c1\u5320\u94fa", "Blacksmith"],
  ["\u88c1\u7f1d", "Tailor"],
  ["\u65c5\u5e97", "Inn"],
  ["\u7814\u7a76\u6240", "Laboratory"],
  ["\u4ea4\u6613\u4e2d\u5fc3", "Trading Center"],
  ["\u9ed1\u5e02\u4ea4\u6613\u7ad9", "Black Market"],
  ["\u8b66\u5bdf\u5c40", "Police Station"],
  ["\u88c5\u5907\u5546\u5e97", "Equipment Shop"],
  ["\u4f9b\u5e94\u5546\u5546\u5e97", "Vendor Shop"],
  ["\u6742\u8d27\u5e97", "General Store"],
  ["\u9493\u9c7c\u5546\u5e97", "Fishing Shop"],
  ["\u795e\u79d8\u5546\u5e97", "Mystery Shop"],
  ["\u9690\u85cf\u5165\u53e3", "Hidden Entrance"],
  ["\u6280\u80fd", "Skill"],
  ["\u85cf\u5b9d\u56fe", "Treasure Map"],
  ["\u8bb0\u5fc6\u788e\u7247", "Memory Fragment"],
  ["\u4fdd\u9669\u7bb1", "Safe"],
  ["\u5750\u9a91", "Mount"],
  ["\u5ba0\u7269", "Pet"],
]);

function translateText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (englishTextMap.has(text)) return englishTextMap.get(text);
  const countMatch = text.match(/^(.+?)\s*[xX]\s*(\d+)$/) || text.match(/^(.+?)\s+(\d+)x$/);
  if (countMatch) {
    const base = translateText(countMatch[1]);
    if (base && !hasCjkText(base)) return base + " x" + countMatch[2];
  }
  return text;
}

function displayText(value, fallback = "Map Marker") {
  const text = translateText(value);
  if (!text || isBrokenText(text) || hasCjkText(text)) return fallback;
  return text;
}

function iconFallbackLabel(icon, fallback = "Map Marker") {
  const text = String(icon || "").toLowerCase();
  if (/castle/.test(text)) return "Stronghold";
  if (/bell/.test(text)) return "Bell";
  if (/marker/.test(text)) return "Landmark";
  if (/dungeon|cave|archway/.test(text)) return "Hidden Area";
  if (/monument|temple|crown|shield|bank/.test(text)) return "Monument";
  if (/entertainment|spade|sun/.test(text)) return "Event";
  if (/plate|pot|meat|food|lollipop|vegetable/.test(text)) return "Food";
  if (/campfire/.test(text)) return "Campfire";
  if (/sword|skull|robot|unicorn|wolf|cat|alien|horse|goat/.test(text)) return "Enemy";
  if (/clipboard|book|blueprint|memory|map_search/.test(text)) return "Document";
  if (/iron|hammer|tool|scissors|brush/.test(text)) return "Tool";
  if (/medicine/.test(text)) return "Medicine";
  if (/key|room-key|arrow-right-to-bracket/.test(text)) return "Key Item";
  if (/apparel|rings|clothing|uniform/.test(text)) return "Equipment";
  if (/shop|cart|sell|exchange|shopping/.test(text)) return "Shop";
  if (/bed/.test(text)) return "Inn";
  if (/science/.test(text)) return "Research";
  if (/fence|tire|stable/.test(text)) return "Facility";
  if (/fish/.test(text)) return "Fish";
  if (/hand|bow-arrow|sim_card|arrow-alt-up/.test(text)) return "Activity";
  if (/dog|pet/.test(text)) return "Pet";
  if (/indeterminate_check_box/.test(text)) return "Safe";
  if (/rocking-horse/.test(text)) return "Mount";
  if (/tree/.test(text)) return "Tree";
  if (/leaf|grass|plant|flower|wheat|mushroom/.test(text)) return "Plant";
  if (/spa|gem|diamond|cube|hexagon|weight|bolt/.test(text)) return "Mineral";
  if (/bug|tornado|boxing|chess|route|tooth|skull|bee|beetle|ant/.test(text)) return "Enemy";
  if (/treasure|chest|gift|box|bottle|tire|bone|egg/.test(text)) return "Material";
  if (/key|book|document|file/.test(text)) return "Collectible";
  const iconName = text.split(":").pop();
  const readable = iconName
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
  return readable || fallback;
}

function markerTypeLabel(subcategory, fallback = "Marker Type") {
  const text = translateText(subcategory?.title);
  if (text && !isBrokenText(text) && !hasCjkText(text)) return text;
  return iconFallbackLabel(subcategory?.icon, fallback);
}

function categoryLabel(category, fallback = "Category") {
  const text = translateText(category?.title);
  if (text && !isBrokenText(text) && !hasCjkText(text)) return text;
  return fallback;
}

function compactCategoryKind(subcategory) {
  const icon = String(subcategory?.icon || "").toLowerCase();
  const label = markerTypeLabel(subcategory, "");
  if (/treasure/.test(icon) || /collect|chest/i.test(label)) return "Collectibles";
  if (/bug|tornado|boxing|chess|route|tooth|skull|bee|beetle|ant/.test(icon)) return "Enemies";
  if (/tree/.test(icon)) return "Trees";
  if (/leaf|grass|plant|flower|wheat|mushroom/.test(icon)) return "Plants";
  if (/spa|gem|diamond|cube|hexagon|weight|bolt/.test(icon)) return "Minerals";
  return "Materials";
}

function normalizeCategoryData(rawCategories, rawSubcategories) {
  const categories = Array.isArray(rawCategories) ? rawCategories : [];
  const subcategories = Array.isArray(rawSubcategories) ? rawSubcategories : [];
  if (categories.length < 18) return { categories, subcategories };

  const subCountByCategory = new Map();
  subcategories.forEach((subcategory) => {
    subCountByCategory.set(subcategory.categoryExternalId, (subCountByCategory.get(subcategory.categoryExternalId) || 0) + 1);
  });
  const singleItemCategories = categories.filter((category) => (subCountByCategory.get(category.externalId) || 0) <= 1).length;
  if (singleItemCategories / categories.length < 0.72) return { categories, subcategories };

  const colors = {
    Collectibles: "#e4b84f",
    Enemies: "#ef6a5b",
    Trees: "#43b66f",
    Plants: "#7bc96f",
    Minerals: "#65a8ff",
    Materials: "#a98cff",
  };
  const compactCategories = Object.entries(colors).map(([title, color]) => ({
    externalId: `compact-${title.toLowerCase()}`,
    title,
    visibleByDefault: true,
    color,
  }));
  const compactSubcategories = subcategories.map((subcategory) => {
    const kind = compactCategoryKind(subcategory);
    return {
      ...subcategory,
      categoryExternalId: `compact-${kind.toLowerCase()}`,
    };
  });
  const used = new Set(compactSubcategories.map((subcategory) => subcategory.categoryExternalId));
  return {
    categories: compactCategories.filter((category) => used.has(category.externalId)),
    subcategories: compactSubcategories,
  };
}

function sanitizeRenderedText(root = document.body) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      const text = node.nodeValue || "";
      return hasCjkText(text) || isBrokenText(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const text = node.nodeValue || "";
    node.nodeValue = displayText(text, text.trim().length > 24 ? "Interactive map details" : "Map details");
  });
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
            <h3>${escapeHtml(displayText(map.name, "Map"))}</h3>
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
  const mapName = displayText(metadata.name, "Map");
  const titleName = displayText(data.mapConfig?.titleName || metadata.titleName || root.dataset.titleName, "");
  document.title = `${titleName ? `${titleName} ` : ""}${mapName} locations map - Interactive marker map`;
  const normalizedMetadata = normalizeCategoryData(metadata.categories, metadata.subcategories);
  const categories = normalizedMetadata.categories;
  const subcategories = normalizedMetadata.subcategories;
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
  let currentMatches = [];
  let mobileSearchOpen = false;
  let mobileSelectionPinned = false;
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
    return displayText(feature.properties.title, markerTypeLabel(subcategory, "Map Marker"));
  }

  function pinImageUrl(properties, size = 250) {
    if (properties?.imageId) return `/pin-images/${encodeURIComponent(properties.imageId)}/${size}.webp`;
    const imagePath = String(properties?.imagePath || "").trim();
    if (!imagePath) return "";
    const resolved = imagePath.replace("{size}", String(size));
    return resolved.startsWith("http") ? resolved : `https://storage-cdn.wemod.com${resolved}`;
  }

  function pinVideoUrl(properties) {
    const videoPath = String(properties?.videoPath || "").trim();
    if (!videoPath) return "";
    return videoPath.startsWith("http") ? videoPath : `https://storage-cdn.wemod.com${videoPath}`;
  }

  function mediaMarkup(feature) {
    const label = markerLabel(feature);
    const imageUrl = pinImageUrl(feature.properties);
    const videoUrl = pinVideoUrl(feature.properties);
    if (!imageUrl && !videoUrl) return "";
    const image = imageUrl
      ? `<img class="marker-media-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(label)} location screenshot" loading="eager" decoding="async" />`
      : "";
    const video = videoUrl
      ? `<video class="marker-media-video${imageUrl ? " is-fallback" : ""}" src="${escapeHtml(videoUrl)}" controls muted playsinline preload="metadata"${imageUrl ? " hidden" : ""}></video>`
      : "";
    return `<figure class="marker-media">${image}${video}</figure>`;
  }

  function wireDetailMediaFallback() {
    const image = detail.querySelector(".marker-media-image");
    if (!image) return;
    image.addEventListener(
      "error",
      () => {
        const figure = image.closest(".marker-media");
        const video = figure?.querySelector(".marker-media-video");
        image.remove();
        if (video) {
          video.hidden = false;
          video.classList.remove("is-fallback");
        } else {
          figure?.remove();
        }
      },
      { once: true },
    );
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
                <span class="category-caret" aria-hidden="true"></span>
                <span>${escapeHtml(categoryLabel(category, "Category"))}</span>
              </span>
              <span class="category-count">${count}</span>
            </button>
            ${subs
              .map(
                (subcategory) => `
                  <button class="subcategory-row" type="button" data-subcategory="${subcategory.externalId}" style="--dot: ${category.color}">
                    <span class="fake-checkbox" aria-hidden="true"></span>
                    <span class="subcategory-icon">${iconMarkup(subcategory)}</span>
                    <span>${escapeHtml(markerTypeLabel(subcategory, "Marker Type"))}</span>
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
      markerTypeLabel(subcategory, ""),
      categoryLabel(category, ""),
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
    currentMatches = matches;
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
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const selectedFeature = features[selectedIndex];
    const selectedSubcategory = subcategoryById[selectedFeature?.properties.subcategoryExternalId];
    const selectedCategory = categoryById[selectedSubcategory?.categoryExternalId];
    const showMobileList = isMobile && mobileSearchOpen;
    const resultIndexes = showMobileList && !query ? matches.slice(0, 40) : matches.slice(0, 40);
    const selectedCard =
      showMobileList && mobileSelectionPinned && selectedFeature
        ? `
          <button class="marker-result is-selected mobile-selected-marker" type="button" data-marker-index="${selectedIndex}">
            <span class="marker-result-icon" style="--dot: ${selectedCategory?.color || "#39e6a9"}">${iconMarkup(selectedSubcategory)}</span>
            <span>
              <strong>${escapeHtml(markerLabel(selectedFeature))}</strong>
              <small>${escapeHtml(categoryLabel(selectedCategory, "Category"))} / ${escapeHtml(markerTypeLabel(selectedSubcategory, "Marker Type"))}</small>
            </span>
          </button>
        `
        : "";

    if (!query && !showMobileList) {
      markerResults.innerHTML = '<p class="marker-results-hint">Search for markers by name or category.</p>';
      return;
    }
    if (!resultIndexes.length) {
      markerResults.innerHTML = '<p class="marker-results-hint">No markers found. Try another search or enable more categories.</p>';
      return;
    }

    markerResults.innerHTML =
      selectedCard +
      resultIndexes
        .filter((index) => !(showMobileList && index === selectedIndex))
      .map((index) => {
        const feature = features[index];
        const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
        const category = categoryById[subcategory?.categoryExternalId];
        return `
          <button class="marker-result" type="button" data-marker-index="${index}">
            <span class="marker-result-icon" style="--dot: ${category?.color || "#39e6a9"}">${iconMarkup(subcategory)}</span>
            <span>
              <strong>${escapeHtml(markerLabel(feature))}</strong>
              <small>${escapeHtml(categoryLabel(category, "Category"))} / ${escapeHtml(markerTypeLabel(subcategory, "Marker Type"))}</small>
            </span>
          </button>
        `;
      })
      .join("");

    markerResults.querySelectorAll("[data-marker-index]").forEach((button) => {
      button.addEventListener("click", () => selectMarker(Number(button.dataset.markerIndex), true));
    });
  }

  function selectMarker(index, shouldCenter = false, revealOnMobile = true) {
    const feature = features[index];
    if (!feature) return;
    selectedIndex = index;
    const subcategory = subcategoryById[feature.properties.subcategoryExternalId];
    const category = categoryById[subcategory?.categoryExternalId];
    markerElements.forEach((marker, markerIndex) => {
      marker.classList.toggle("is-selected", markerIndex === selectedIndex);
    });
    detail.innerHTML = `
      <span>${escapeHtml(categoryLabel(category, "Category"))} / ${escapeHtml(markerTypeLabel(subcategory, "Marker Type"))}</span>
      <strong><span class="detail-icon" style="--dot: ${category?.color || "#39e6a9"}">${iconMarkup(subcategory)}</span>${escapeHtml(markerLabel(feature))}</strong>
      ${mediaMarkup(feature)}
      <p>${escapeHtml(displayText(feature.properties.description, "No extra description is available for this marker.")).replace(/\n/g, "<br>")}</p>
    `;
    wireDetailMediaFallback();
    if (revealOnMobile && window.matchMedia("(max-width: 640px)").matches) {
      mobileSearchOpen = true;
      mobileSelectionPinned = true;
      document.querySelector(".map-control-panel")?.classList.add("is-search-open");
      renderSearchResults(currentMatches);
    }
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
    mobileSearchOpen = true;
    document.querySelector(".map-control-panel")?.classList.add("is-search-open");
    updateVisibility();
  });
  search?.addEventListener("focus", () => {
    mobileSearchOpen = true;
    document.querySelector(".map-control-panel")?.classList.add("is-search-open");
    renderSearchResults(currentMatches);
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
  selectMarker(0, false, false);
}

Promise.all([initHome(), initOutboundList(), initOutboundDetail()])
  .then(() => sanitizeRenderedText())
  .catch(() => sanitizeRenderedText());
