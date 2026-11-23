#!/usr/bin/env node
/**
 * Downloads Pexels preview frames for a hand-picked candidate list and
 * builds a labelled contact sheet so the selection can be reviewed.
 *
 *   node tools/get-photos.mjs [sheet|full <id...>]
 */
import { mkdir, writeFile } from "node:fs/promises";

export const CANDIDATES = [
  // exteriors, hero / dusk
  13752348, 7031407, 7031405, 10610731, 323781, 15776258, 16246068,
  36687869, 13772063, 34188582, 38850589, 7031594, 17174767, 39011061,
  // pool + terrace
  40808027, 8134745, 8134750, 28681443, 27195983, 13203183, 13203193,
  13203188, 13203179, 40665038, 13041127,
  // living
  32922275, 12291713, 35419464, 11179087, 37771938, 35373125, 35373120,
  31467609,
  // bedroom
  31728399, 34549303, 33326583, 31086264, 35229094, 37192232, 34980879,
  35229097,
  // kitchen
  7601117, 36777862, 36777557, 30673264, 6436792, 31238726, 39404259,
  37153434,
  // architectural detail
  6712840,
];

const EFFECTIVE_WIDTH = 900;
const cdns = (id, w) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

async function download(id, dir, w) {
  const res = await fetch(cdns(id, w));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(`${dir}/${id}.jpg`, buf);
  return { id, bytes: buf.length };
}

const mode = process.argv[2] || "sheet";
await mkdir(".cache/px", { recursive: true });

if (mode === "sheet") {
  let ok = 0;
  let next = 0;
  const ids = [...CANDIDATES];
  async function worker() {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const r = await download(id, ".cache/px", EFFECTIVE_WIDTH);
        ok++;
        if (r.bytes < 4000) console.warn(`? ${id} suspiciously small`);
      } catch (e) {
        console.error(`! ${id}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`${ok}/${ids.length} previews in .cache/px`);

  const cells = ids
    .map(
      (id) =>
        `<figure><img src="px/${id}.jpg" loading="eager"><figcaption>${id}</figcaption></figure>`
    )
    .join("");
  await writeFile(
    ".cache/pexels.html",
    `<!doctype html><meta charset="utf-8"><style>
     body{margin:0;background:#111;font:12px ui-monospace,monospace;color:#eee}
     .g{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;padding:5px}
     figure{margin:0;position:relative}
     img{display:block;width:100%;height:180px;object-fit:cover;background:#222}
     figcaption{position:absolute;left:0;top:0;background:#000c;color:#0f0;padding:1px 4px;font-weight:700}
     </style><div class="g">${cells}</div>`
  );
  console.log(".cache/pexels.html");
}
