import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pagesRoot = join(root, "pages");
const dataRoot = join(root, "data");
const base = "/game_map";

async function walk(dir, matcher = () => true) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path, matcher)));
    else if (matcher(path)) files.push(path);
  }
  return files;
}

function prefixRootPaths(text) {
  let output = text;
  output = output.replace(/((?:href|src|data-source|data-base-path|data-map-data)=["'])\/(?!game_map\/|\/)/g, `$1${base}/`);
  output = output.replace(/url\('\/(?!game_map\/|\/)/g, `url('${base}/`);
  output = output.replace(/url\("\/(?!game_map\/|\/)/g, `url("${base}/`);
  output = output.replace(/"\/assets\/images\/games\//g, `"${base}/assets/images/games/`);
  output = output.replace(/"\/data\//g, `"${base}/data/`);
  output = output.replace(/"\/maps\//g, `"${base}/maps/`);
  output = output.replace(/"\/tiles\//g, `"${base}/tiles/`);
  return output;
}

const textFiles = [
  join(root, "index.html"),
  join(root, "script.js"),
  join(root, "styles.css"),
  join(root, "server.mjs"),
  ...(await walk(join(root, "pages"), (path) => path.endsWith(".html"))),
  ...(await walk(dataRoot, (path) => path.endsWith(".json"))),
];

let changed = 0;
for (const file of textFiles) {
  const before = await readFile(file, "utf8");
  const after = prefixRootPaths(before);
  if (after !== before) {
    await writeFile(file, after);
    changed += 1;
  }
}

console.log(`GitHub Pages path cleanup complete. Updated ${changed} files.`);
