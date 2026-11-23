/* ============================================================
   Generates the soft smoke / cloud overlays used by the section
   transitions. Original procedural artwork: value-noise fbm,
   stretched horizontally, edge-faded, then upscaled and blurred
   so it reads as drifting haze rather than grain.

     node tools/gen-smoke.mjs
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = "assets/img";

const hash = (x, y, s) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

const noise = (x, y, s) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

const fbm = (x, y, s, oct = 5) => {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += amp * noise(x * f, y * f, s + i * 13.7);
    f *= 2;
    amp *= 0.5;
  }
  return v;
};

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Writes one billow sheet: low-res fbm, upscaled + blurred to softness. */
async function sheet({ file, seed, scaleX, scaleY, rise, colour, alpha }) {
  const W = 560;
  const H = 315;
  const buf = Buffer.alloc(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const v = y / H;

      // domain-warped fbm: the warp is what turns noise into drifting smoke
      const px = u * scaleX;
      const py = v * scaleY + rise;
      const warp = fbm(px * 0.7 + 5.2, py * 0.7, seed + 41, 3);
      let n = fbm(px + warp * 1.5, py + warp * 0.9, seed, 6);

      // billows: a threshold on the warped field, firm rim, full-alpha core
      let a = smoothstep(0.38, 0.56, n);

      // a second, looser field breaks the sheet into separate clouds
      const body = smoothstep(0.28, 0.56, fbm(px * 0.42, py * 0.42, seed + 77, 3));
      a *= Math.pow(body, 0.55);

      // internal density variation keeps it from reading as one flat blur
      a *= 0.78 + 0.22 * fbm(px * 3.1, py * 3.1, seed + 9, 3);

      // fade the sheet to nothing at its edges so it can sit anywhere
      const dx = Math.abs(u - 0.5) * 2;
      const dy = Math.abs(v - 0.5) * 2;
      const edge = 1 - smoothstep(0.48, 1.0, Math.max(dx, dy * 0.9));
      a *= Math.pow(edge, 0.7);
      a = Math.pow(Math.min(1, a), 0.85) * alpha;

      const i = (y * W + x) * 4;
      buf[i] = colour[0];
      buf[i + 1] = colour[1];
      buf[i + 2] = colour[2];
      buf[i + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
    }
  }

  const out = path.join(OUT, file);
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .resize(1280, 720, { fit: "fill", kernel: "cubic" })
    .blur(2)
    .png({ compressionLevel: 9, palette: true, colours: 160, effort: 10 })
    .toFile(out);

  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`${file.padEnd(18)} ${String(kb).padStart(4)} kB`);
}

const WHITE = [253, 250, 243];
const BEIGE = [178, 162, 136];

await sheet({ file: "smoke-1-white.png", seed: 3.1, scaleX: 2.4, scaleY: 1.3, rise: 0.0, colour: WHITE, alpha: 1 });
await sheet({ file: "smoke-2-white.png", seed: 8.7, scaleX: 3.2, scaleY: 1.1, rise: 0.3, colour: WHITE, alpha: 0.95 });
await sheet({ file: "smoke-1-beige.png", seed: 3.1, scaleX: 2.4, scaleY: 1.3, rise: 0.0, colour: BEIGE, alpha: 0.95 });
await sheet({ file: "smoke-2-beige.png", seed: 8.7, scaleX: 3.2, scaleY: 1.1, rise: 0.3, colour: BEIGE, alpha: 0.9 });
