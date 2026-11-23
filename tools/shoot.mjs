#!/usr/bin/env node
/**
 * Screenshots the local build at given scroll positions, using the Chrome
 * that is already installed (no bundled browser).
 *
 *   node tools/shoot.mjs [url] [y:label ...] [--w 390 --h 844]
 *   node tools/shoot.mjs http://localhost:4173/ 0:hero 1500:about
 */
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const flag = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const width = flag("--w", 1440);
const height = flag("--h", 900);

const url = process.argv[2] || "http://localhost:4173/";
const targets = (process.argv.slice(3).length ? process.argv.slice(3) : ["0:top"])
  .filter((a) => !a.startsWith("--") && a !== String(width) && a !== String(height))
  .map(
  (t) => {
    const [y, label] = t.split(":");
    return { y: Number(y), label: label || `y${y}` };
  }
);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--disable-gpu"],
  defaultViewport: { width, height, isMobile: width < 700, hasTouch: width < 700 },
});

const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("console error:", m.text());
});
page.on("pageerror", (e) => console.log("page error:", e.message));
page.on("requestfailed", (r) => console.log("failed:", r.url()));

await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
// let the loader finish and the first paint settle
await new Promise((r) => setTimeout(r, 6000));

for (const { y, label } of targets) {
  await page.evaluate((top) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, top);
  }, y);
  await new Promise((r) => setTimeout(r, 1400)); // rAF engine + reveals
  const file = `.cache/shots/${label}.png`;
  await page.screenshot({ path: file });
  console.log(file);
}

await browser.close();
