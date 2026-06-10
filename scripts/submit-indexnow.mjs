import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const host = "wandergamemap.com";
const key = "23f0b80aff9b40c89ea3205917ae6c01";
const keyLocation = `https://${host}/${key}.txt`;
const sitemap = await readFile(`${root}/sitemap.xml`, "utf8");
const urlList = [...sitemap.matchAll(/<loc>(https:\/\/wandergamemap\.com\/[^<]*)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url, index, urls) => urls.indexOf(url) === index);

if (!urlList.length) {
  throw new Error("No wandergamemap.com URLs found in sitemap.xml");
}

if (process.argv.includes("--dry-run")) {
  console.log(`IndexNow ready: ${urlList.length} URLs, key ${keyLocation}`);
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});

if (!response.ok && response.status !== 202) {
  throw new Error(`IndexNow submission failed: ${response.status} ${await response.text()}`);
}

console.log(`IndexNow accepted ${urlList.length} URLs (${response.status}).`);
