#!/usr/bin/env node
/**
 * Installs the curated photography into assets/img as cropped WebP files.
 *
 * Source: Pexels (Pexels licence — free for commercial and personal use,
 * no attribution required). Each slot below records the photo it came from.
 *
 *   node tools/install-images.mjs
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import sharp from "sharp";

/** file, pexels photo id, output width, output height, crop gravity */
const MANIFEST = [
  // hero — villa lit at dusk, 3:2
  ["hero", 13752348, 2400, 1600],

  // about gallery tiles + carousel (4:3 / 3:2)
  ["living-room", 32631105, 1000, 750],
  ["detail", 38344729, 900, 675],
  ["kitchen", 36777862, 1000, 750],
  ["side", 10610731, 1000, 750],
  ["top", 13041127, 1000, 750],
  ["residence-hero", 40665038, 1000, 750],
  ["patio-front", 36394726, 1600, 1067],
  ["landscape-house", 13203179, 1600, 1067],
  ["exterior-garden", 27195983, 1600, 1067],

  // structure viewer frames, 16:10
  ["frame-1", 13772063, 2000, 1250],
  ["frame-2", 13203193, 2000, 1250],
  ["frame-3", 13203183, 2000, 1250],
  ["frame-4", 38850589, 2000, 1250],
  ["frame-5", 7031407, 2000, 1250],
  ["frame-6", 11179087, 2000, 1250],
  ["frame-7", 34980879, 2000, 1250],

  // residence 01 slides, 3:2
  ["slide-1", 13203188, 1600, 1067],
  ["slide-2", 17174767, 1600, 1067],

  // residence 02 apartment sequence, 16:9
  ["apartment-living", 37771938, 2000, 1125],
  ["apartment-bedroom", 34549303, 2000, 1125],
  ["apartment-bedroom-2", 35229094, 2000, 1125],

  // immersive tour, 16:9
  ["apartment-tour", 31737861, 2200, 1238],
];

const SRC = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=2600`;

await mkdir("assets/img", { recursive: true });
await mkdir(".cache/src", { recursive: true });

let total = 0;
const credits = [];

for (const [name, id, w, h, gravity = "centre"] of MANIFEST) {
  const out = `assets/img/${name}.webp`;
  const raw = `.cache/src/${id}.jpg`;

  // cache the source JPEG so re-crops do not re-download
  const cached = await stat(raw).then(() => true).catch(() => false);
  if (!cached) {
    const res = await fetch(SRC(id), {
      headers: { "User-Agent": "stillform-clone-study/1.0" },
    });
    if (!res.ok) {
      console.error(`! ${name}: source HTTP ${res.status} (photo ${id})`);
      continue;
    }
    await writeFile(raw, Buffer.from(await res.arrayBuffer()));
  }
  const input = raw;

  await sharp(input, { failOn: "none" })
    .resize({ width: w, height: h, fit: "cover", position: gravity })
    .modulate({ saturation: 0.92 }) // calm the tone toward the reference palette
    .webp({ quality: 82, effort: 5 })
    .toFile(out);

  const { size } = await stat(out);
  total += size;
  credits.push({ name, id, kb: Math.round(size / 1024) });
  console.log(`${name.padEnd(20)} ${String(Math.round(size / 1024)).padStart(4)} kB  ← pexels ${id}`);
}

await writeFile(
  "IMAGE-CREDITS.md",
  `# Image credits\n\nAll photography in \`assets/img\` comes from [Pexels](https://www.pexels.com) and is used\nunder the [Pexels licence](https://www.pexels.com/license/): free for personal and\ncommercial use, no attribution required. Provenance is recorded here anyway so every\nslot can be traced back to its source.\n\nThese are **not** the reference site's photographs — those are copyrighted and were\nnot downloaded. See README.md.\n\n| file | source |\n| --- | --- |\n${credits
  .map((c) => `| \`assets/img/${c.name}.webp\` | https://www.pexels.com/photo/${c.id}/ |`)
  .join("\n")}\n`
);

console.log(`\n${credits.length} images, ${(total / 1024 / 1024).toFixed(2)} MB total`);
console.log("IMAGE-CREDITS.md written");
