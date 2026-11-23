#!/usr/bin/env node
/**
 * Builds labelled contact sheets from .cache/candidates.json so the
 * downloaded previews can be reviewed in a few screenshots.
 *
 *   node tools/contact-sheet.mjs
 */
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cands = JSON.parse(await readFile(".cache/candidates.json", "utf8"));
const withFile = [];
for (const c of cands) {
  const base = `.cache/cand/${String(c.n).padStart(3, "0")}`;
  for (const ext of ["jpg", "png"]) {
    try {
      await access(`${base}.${ext}`);
      withFile.push({ ...c, file: `${base}.${ext}`.replace(/\\/g, "/") });
      break;
    } catch {}
  }
}

const PER_SHEET = 64;
const sheets = Math.ceil(withFile.length / PER_SHEET);
for (let s = 0; s < sheets; s++) {
  const rows = withFile.slice(s * PER_SHEET, (s + 1) * PER_SHEET);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#111;color:#eee;font:11px/1.3 ui-monospace,monospace}
  .g{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;padding:6px}
  figure{margin:0;position:relative;background:#222}
  img{display:block;width:100%;height:150px;object-fit:cover}
  figcaption{position:absolute;left:0;top:0;background:#000c;color:#0f0;padding:1px 4px;font-weight:700}
  .t{position:absolute;left:0;bottom:0;right:0;background:#000c;padding:1px 3px;font-size:9px;
     white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  </style></head><body><div class="g">${rows
    .map(
      (r) => `<figure><img src="${path
        .resolve(r.file)
        .replace(/\\/g, "/")}"><figcaption>${r.n}</figcaption><div class="t">${(
        r.title || ""
      )
        .replace(/[<>&]/g, "")
        .slice(0, 46)}</div></figure>`
    )
    .join("")}</div></body></html>`;
  const out = `.cache/sheet-${s + 1}.html`;
  await writeFile(out, html);
  console.log(out, rows.length, "images");
}
