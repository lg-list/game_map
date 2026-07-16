import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "_site");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const copies = [
  ["CNAME", "CNAME"],
  ["index.html", "index.html"],
  ["404.html", "404.html"],
  ["about", "about"],
  ["advertising-policy", "advertising-policy"],
  ["contact", "contact"],
  ["editorial-policy", "editorial-policy"],
  ["guides", "guides"],
  ["privacy", "privacy"],
  ["terms", "terms"],
  ["styles.css", "styles.css"],
  ["script.js", "script.js"],
  ["favicon.ico", "favicon.ico"],
  ["logo.png", "logo.png"],
  ["robots.txt", "robots.txt"],
  ["sitemap.xml", "sitemap.xml"],
  ["ads.txt", "ads.txt"],
  ["23f0b80aff9b40c89ea3205917ae6c01.txt", "23f0b80aff9b40c89ea3205917ae6c01.txt"],
  ["assets", "assets"],
  ["data", "data"],
  [join("pages", "maps"), "maps"],
];

for (const [from, to] of copies) {
  await cp(join(root, from), join(out, to), { recursive: true });
}

function publicString(value) {
  const text = String(value ?? "")
    .replace(/\ufffd/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";
  if (/[\u3400-\u9fff]/.test(text)) return "";
  if (/(?:ä|å|ç|è|é|æ|ð|Â|Ã|ï¿½)/.test(text)) return "";
  if (/not applicable/i.test(text) || /N\/A/i.test(text)) return "";
  return text;
}

function sanitizeJson(value) {
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeJson(item)]));
  }
  if (typeof value === "string") return publicString(value);
  return value;
}

async function sanitizePublicData(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await sanitizePublicData(path);
      continue;
    }
    if (!entry.name.endsWith(".json")) continue;
    const data = JSON.parse(await readFile(path, "utf8"));
    await writeFile(path, `${JSON.stringify(sanitizeJson(data))}\n`);
  }
}

await sanitizePublicData(join(out, "data"));

await writeFile(join(out, ".nojekyll"), "");

console.log("GitHub Pages build complete: _site");
