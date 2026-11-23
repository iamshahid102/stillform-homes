#!/usr/bin/env node
/**
 * Searches Openverse for CC0 / public-domain architectural photography.
 * Writes a JSON candidate list to /tmp/candidates.json and downloads
 * small previews to .cache/cand/ so the shots can be reviewed before use.
 *
 *   node tools/find-photos.mjs
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";

const QUERIES = [
  "mid century modern house exterior",
  "modernist villa architecture",
  "brutalist house concrete",
  "timber house architecture",
  "modern house window facade",
  "scandinavian interior living room",
  "minimal interior architecture daylight",
  "modern kitchen island interior",
  "bedroom interior natural light",
  "concrete wall detail architecture",
  "terrace swimming pool modern house",
  "house at dusk lights on",
  "courtyard house architecture",
  "architectural detail wood stone",
];

const SOURCES = "flickr,stocksnap,rawpixel";

const UA = "stillform-clone-study/1.0 (layout practice; contact: local)";

async function search(q, page = 1) {
  const url =
    "https://api.openverse.org/v1/images/?" +
    new URLSearchParams({
      q,
      license: "cc0,pdm,by",
      source: SOURCES,
      page_size: "20",
      page: String(page),
      aspect_ratio: "wide",
      mature: "false",
    });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.error(`! ${q} p${page}: HTTP ${res.status}`);
    return [];
  }
  const json = await res.json();
  return (json.results || []).map((r) => ({
    q,
    id: r.id,
    title: r.title,
    creator: r.creator,
    license: r.license,
    source: r.source,
    landing: r.foreign_landing_url,
    url: r.url,
    thumb: r.thumbnail,
    width: r.width,
    height: r.height,
  }));
}

const all = [];
for (const q of QUERIES) {
  const rows = [...(await search(q, 1)), ...(await search(q, 2))];
  console.log(`${q.padEnd(34)} ${rows.length}`);
  all.push(...rows);
}

// keep large-ish landscape frames only, dedupe by id
const seen = new Set();
const good = all.filter((r) => {
  if (seen.has(r.id)) return false;
  seen.add(r.id);
  if (r.width && r.width < 1000) return false;
  if (!r.width || !r.height) return true;
  const ar = r.width / r.height;
  return ar >= 1.2 && ar <= 2.0;
});

await mkdir(".cache/cand", { recursive: true });
good.forEach((r, i) => (r.n = i));
await writeFile(".cache/candidates.json", JSON.stringify(good, null, 2));

// small previews for review
let next = 0;
async function worker() {
  while (next < good.length) {
    const r = good[next++];
    const src = r.thumb || r.url;
    try {
      const res = await fetch(src, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = (res.headers.get("content-type") || "image/jpeg").includes("png")
        ? "png"
        : "jpg";
      await writeFile(`.cache/cand/${String(r.n).padStart(3, "0")}.${ext}`, buf);
    } catch (e) {
      console.error(`! preview ${r.n}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

console.log(`\n${all.length} results → ${good.length} usable candidates`);
console.log("previews in .cache/cand/");
