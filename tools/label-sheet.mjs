#!/usr/bin/env node
/**
 * Builds a labelled contact sheet from Pexels ids so a photo can be matched to
 * the id that actually returns it (no guesswork from a screenshot).
 *
 *   node tools/label-sheet.mjs 7031407 15776258 ... [--out .cache/labelled.jpg]
 */
import sharp from "sharp";
import { mkdir, stat, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const out = outIdx > -1 ? args[outIdx + 1] : ".cache/labelled.jpg";
const ids = args.filter((a, i) => !a.startsWith("--") && i !== outIdx + 1);

const COLS = 5;
const CW = 300;
const CH = 200;
const LH = 22;
const CELL = CH + LH;

const SRC = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

await mkdir(".cache/px", { recursive: true });

const rows = Math.ceil(ids.length / COLS);
const canvas = sharp({
  create: {
    width: COLS * CW,
    height: rows * CELL,
    channels: 3,
    background: "#111111",
  },
});

const layers = [];
let labels = "";
const missing = [];

for (const [i, id] of ids.entries()) {
  const cache = `.cache/px/lab-${id}.jpg`;
  const has = await stat(cache).then(() => true).catch(() => false);
  if (!has) {
    const res = await fetch(SRC(id), {
      headers: { "User-Agent": "stillform-clone-study/1.0" },
    });
    if (!res.ok) {
      missing.push(`${id} (HTTP ${res.status})`);
      continue;
    }
    await writeFile(cache, Buffer.from(await res.arrayBuffer()));
  }

  const cell = await sharp(cache)
    .resize({ width: CW, height: CH, fit: "cover" })
    .toBuffer();

  const x = (i % COLS) * CW;
  const y = Math.floor(i / COLS) * CELL;
  layers.push({ input: cell, left: x, top: y });
  labels += `<text x="${x + 8}" y="${y + CH + 16}" font-family="monospace" font-size="15" fill="#f4f1e9">${id}</text>`;
}

const labelLayer = Buffer.from(
  `<svg width="${COLS * CW}" height="${rows * CELL}" xmlns="http://www.w3.org/2000/svg">${labels}</svg>`
);
layers.push({ input: labelLayer, left: 0, top: 0 });

await canvas.composite(layers).jpeg({ quality: 74 }).toFile(out);
console.log(out);
if (missing.length) console.log("missing:", missing.join(", "));
