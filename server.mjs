import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const tileCacheRoot = join(root, ".tile-cache");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
};

const tileSources = {
  "outbound/the-outdoors": {
    base: "https://storage-cdn.wemod.com/maps/ccd13118-a433-4455-848b-d0dfad5a4d5a/tiles",
    maxZoom: 3,
    tmsEnabled: false,
  },
  "outbound/the-coast": {
    base: "https://storage-cdn.wemod.com/maps/ae8fc0b7-dbd8-4a84-a8d8-0c46c284b51e/tiles",
    maxZoom: 3,
    tmsEnabled: false,
  },
  "subnautica-2/proteus": {
    base: "https://storage-cdn.wemod.com/maps/1a53e038-3dfb-430f-a1c1-abe712e3be1e/tiles",
    maxZoom: 6,
    tmsEnabled: false,
  },
  "code-vein-ii/world": {
    base: "https://storage-cdn.wemod.com/maps/07c9afb0-8fdf-4b71-85d2-8417e8059deb/tiles",
    maxZoom: 6,
    tmsEnabled: false,
  },
  "crimson-desert/pywel": {
    base: "https://storage-cdn.wemod.com/maps/d30aa9d1-76bd-4c20-9382-441c0ea36505/tiles",
    maxZoom: 6,
    tmsEnabled: false,
  },
  "arc-raiders/buried-city": {
    base: "https://storage-cdn.wemod.com/maps/4d310079-3698-4e6e-929c-a37dfd74e73e/tiles",
    maxZoom: 5,
    tmsEnabled: false,
  },
  "arc-raiders/dam-batlegrounds": {
    base: "https://storage-cdn.wemod.com/maps/23684952-d53d-41e6-87ae-fc8a6589bc3f/tiles",
    maxZoom: 5,
    tmsEnabled: false,
  },
  "arc-raiders/stella-montis-upper": {
    base: "https://storage-cdn.wemod.com/maps/d2a7f0db-7741-46d3-933f-63f895a5386d/tiles",
    maxZoom: 5,
    tmsEnabled: false,
  },
  "arc-raiders/stella-montis-lower": {
    base: "https://storage-cdn.wemod.com/maps/27010cc6-50de-4671-8c34-a851d64ae3f1/tiles",
    maxZoom: 4,
    tmsEnabled: false,
  },
  "arc-raiders/the-blue-gate": {
    base: "https://storage-cdn.wemod.com/maps/b69854b4-10ed-44bb-9763-2f4c7ff9b23c/tiles",
    maxZoom: 4,
    tmsEnabled: false,
  },
  "arc-raiders/the-spaceport": {
    base: "https://storage-cdn.wemod.com/maps/e20774a6-25ff-4f12-a7be-5d9eb2acdc6f/tiles",
    maxZoom: 4,
    tmsEnabled: false,
  },
  "arc-raiders/riven-tides": {
    base: "https://storage-cdn.wemod.com/maps/5459715a-2ca5-4001-bdd6-cb334763dcc9/tiles",
    maxZoom: 6,
    tmsEnabled: false,
  },
};

let dynamicTileSources = null;

async function getTileSources() {
  if (dynamicTileSources) return dynamicTileSources;
  try {
    const body = await readFile(join(root, "data", "tile-sources.json"), "utf8");
    dynamicTileSources = { ...tileSources, ...JSON.parse(body) };
  } catch {
    dynamicTileSources = tileSources;
  }
  return dynamicTileSources;
}

function tileCachePath(tileKey, z, x, y) {
  const safeKey = tileKey
    .split("/")
    .map((part) => part.replace(/[^a-z0-9._-]/gi, "_"))
    .join("/");
  return join(tileCacheRoot, safeKey, String(z), String(x), `${y}.webp`);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const tileMatch = url.pathname.match(/^\/tiles\/(.+)\/(\d+)\/(\d+)\/(\d+)\.webp$/);
    if (tileMatch) {
      const tileKey = decodeURIComponent(tileMatch[1]);
      const sources = await getTileSources();
      const source = sources[tileKey] || sources[`outbound/${tileKey}`];
      if (!source) {
        response.writeHead(404);
        response.end("Unknown tile source");
        return;
      }
      let z = Number(tileMatch[2]);
      let x = Number(tileMatch[3]);
      let y = Number(tileMatch[4]);
      if (z > source.maxZoom) {
        const factor = 2 ** (z - source.maxZoom);
        x = Math.floor(x / factor);
        y = Math.floor(y / factor);
        z = source.maxZoom;
      }
      const upstreamY = source.tmsEnabled ? 2 ** z - 1 - y : y;
      const upstream = source.tmsEnabled
        ? `${source.base}/${z}/${x}/${upstreamY}.webp`
        : `${source.base}/${z}/${upstreamY}/${x}.webp`;
      const cachePath = tileCachePath(tileKey, z, x, y);
      try {
        const cached = await readFile(cachePath);
        response.writeHead(200, {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
          "X-Tile-Cache": "HIT",
        });
        response.end(cached);
        return;
      } catch {
        // Cache miss, fetch the tile from the upstream map CDN.
      }

      const tile = await fetch(upstream);
      if (!tile.ok) {
        response.writeHead(tile.status);
        response.end("Tile not found");
        return;
      }
      const body = Buffer.from(await tile.arrayBuffer());
      mkdir(dirname(cachePath), { recursive: true })
        .then(() => writeFile(cachePath, body))
        .catch(() => {});
      response.writeHead(200, {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
        "X-Tile-Cache": "MISS",
      });
      response.end(body);
      return;
    }
    const requestPath = url.pathname === "/" || extname(url.pathname) === "" ? `${url.pathname.replace(/\/?$/, "/")}index.html` : url.pathname;
    const path = requestPath.startsWith("/") ? requestPath : `/${requestPath}`;
    const decodedPath = decodeURIComponent(path);
    const candidates = [normalize(join(root, decodedPath))];
    if (decodedPath.startsWith("/maps/")) {
      candidates.unshift(normalize(join(root, "pages", decodedPath)));
    }

    for (const filePath of candidates) {
      try {
        const body = await readFile(filePath);
    const contentType = types[extname(filePath)] || "application/octet-stream";
    const cacheControl = [".html", ".css", ".js", ".json"].includes(extname(filePath)) ? "no-store" : "public, max-age=86400";
    response.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl });
        response.end(body);
        return;
      } catch {
        // Try the next location before returning a 404.
      }
    }

    response.writeHead(404);
    response.end("Not found");
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(5173, "127.0.0.1");
