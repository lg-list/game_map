import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "_site");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const copies = [
  ["CNAME", "CNAME"],
  ["index.html", "index.html"],
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

await writeFile(join(out, ".nojekyll"), "");

console.log("GitHub Pages build complete: _site");
