import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pagesRoot = join(root, "pages");
const dataRoot = join(root, "data");

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

function normalizeRootPaths(text) {
  let output = text;
  output = output.replaceAll("/game_map/", "/");
  output = output.replace(/\/game_map(?=(["'#?]|$))/g, "/");
  return output;
}

const textFiles = [
  join(root, "index.html"),
  join(root, "script.js"),
  join(root, "styles.css"),
  ...(await walk(join(root, "pages"), (path) => path.endsWith(".html"))),
  ...(await walk(dataRoot, (path) => path.endsWith(".json"))),
];

let changed = 0;
for (const file of textFiles) {
  const before = await readFile(file, "utf8");
  const after = normalizeRootPaths(before);
  if (after !== before) {
    await writeFile(file, after);
    changed += 1;
  }
}

console.log(`Root domain path cleanup complete. Updated ${changed} files.`);
