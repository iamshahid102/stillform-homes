/**
 * Generates original SVG artwork for the clone.
 * `node tools/gen-placeholders.mjs`
 *
 * Every file is an original code-drawn study in the reference palette
 * (#EDE6D6 bone / #2A2725 ink / warm sand) at the same aspect ratios the
 * layout expects — not a copy of anyone's photography.
 */
import { writeFile, mkdir } from "node:fs/promises";

const OUT = "assets/img";
const W = 1600;
const H = 1000;

const P = {
  bone: "#EDE6D6",
  paper: "#F4EEE1",
  sand: "#DDD2BC",
  stone: "#C4B8A2",
  clay: "#B3A48C",
  ink: "#2A2725",
  slate: "#4C4741",
  olive: "#6E7261",
  oliveDeep: "#4E5346",
  warm: "#E3BB7C",
  ember: "#C98F4E",
  sky: ["#CFC6B4", "#E6DECD", "#F1EADC"],
  dusk: ["#5E5A52", "#8C8579", "#C4B49D"],
};

/* deterministic pseudo-random so regenerating gives identical files */
function rng(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  return () => ((s = (s * 48271) % 2147483647) / 2147483647);
}

const defs = (id, top, mid, bottom, warmAt = 0.72) => `
  <defs>
    <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset=".55" stop-color="${mid}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="sun-${id}" cx="${warmAt}" cy=".34" r=".55">
      <stop offset="0" stop-color="${P.warm}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${P.warm}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass-${id}" x1="0" y1="0" x2=".3" y2="1">
      <stop offset="0" stop-color="${P.warm}" stop-opacity=".92"/>
      <stop offset="1" stop-color="${P.ember}" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="shade-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".26"/>
      <stop offset="1" stop-color="#000" stop-opacity=".04"/>
    </linearGradient>
    <filter id="soft-${id}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
    <filter id="grain-${id}">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".05"/></feComponentTransfer>
    </filter>
    <clipPath id="clip-${id}"><rect width="${W}" height="${H}"/></clipPath>
  </defs>`;

function grain(id) {
  return `<rect width="${W}" height="${H}" filter="url(#grain-${id})" opacity=".5"/>`;
}

function vignette() {
  return `<rect width="${W}" height="${H}" fill="none"/>
    <radialGradient id="vig" cx=".5" cy=".5" r=".78">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </radialGradient>
    <rect width="${W}" height="${H}" fill="url(#vig)"/>`;
}

/* ---------- exterior: house masses, deep reveals, trees ---------- */
function exterior(name, { dusk = false, trees = 3, pool = false, elegant = 16 }) {
  const r = rng(name);
  const [t, m, b] = dusk ? P.dusk : P.sky;
  const wallA = dusk ? "#39352F" : "#D7CCB6";
  const wallB = dusk ? "#2E2B26" : "#C3B7A1";
  const wallC = dusk ? "#242220" : "#AEA28B";
  const ground = dusk ? "#2A2725" : "#B7AA92";

  const houseX = 240 + r() * 120;
  const houseW = 760 + r() * 260;
  const base = 690;
  const h1 = 190 + r() * 60;
  const h2 = 120 + r() * 70;

  let win = "";
  const cols = Math.max(3, Math.round(houseW / 150));
  const cw = houseW / cols;
  for (let c = 0; c < cols; c++) {
    if (r() < 0.18) continue;
    const x = houseX + c * cw + cw * 0.18;
    const w = cw * 0.62;
    const lit = r() < (dusk ? 0.75 : 0.35);
    win += `<rect x="${x}" y="${base - h1 + 58}" width="${w}" height="${h1 * 0.5}" fill="${lit ? `url(#glass-${name})` : P.ink}" opacity="${lit ? 0.9 : 0.85}"/>`;
  }
  for (let c = 0; c < cols - 1; c++) {
    const x = houseX + c * cw + cw * 0.18;
    if (r() < 0.4) continue;
    win += `<rect x="${x}" y="${base - h2 - 6}" width="${cw * 0.5}" height="${h2 * 0.4}" fill="${P.ink}" opacity=".8"/>`;
  }

  let foliage = "";
  for (let i = 0; i < trees; i++) {
    const tx = 60 + r() * (W - 140);
    const ty = base - 30 - r() * 40;
    const s = 0.65 + r() * 0.9;
    const color = dusk ? P.oliveDeep : i % 2 ? P.olive : "#7C8069";
    foliage += `<g opacity="${dusk ? 0.9 : 0.75}" transform="translate(${tx} ${ty}) scale(${s})">
      <rect x="-4" y="-70" width="8" height="80" fill="${dusk ? "#211F1B" : "#8A7F6B"}"/>
      <ellipse cx="0" cy="-96" rx="${58 + r() * 26}" ry="${72 + r() * 30}" fill="${color}"/>
      <ellipse cx="-40" cy="-64" rx="${40 + r() * 16}" ry="${46 + r() * 18}" fill="${color}" opacity=".85"/>
      <ellipse cx="40" cy="-58" rx="${38 + r() * 14}" ry="${44 + r() * 16}" fill="${color}" opacity=".85"/>
    </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Architectural study">
  ${defs(name, t, m, b, dusk ? 0.7 : 0.68)}
  <rect width="${W}" height="${H}" fill="url(#sky-${name})"/>
  <rect width="${W}" height="${H}" fill="url(#sun-${name})"/>
  <circle cx="${W * (dusk ? 0.7 : 0.68)}" cy="${H * 0.34}" r="120" fill="${P.warm}" opacity="${dusk ? 0.28 : 0.18}" filter="url(#soft-${name})"/>
  <rect y="${base}" width="${W}" height="${H - base}" fill="${ground}"/>
  ${pool ? `<rect x="${houseX - 40}" y="${base + 40}" width="${houseW + 120}" height="120" fill="${dusk ? "#3C4A4E" : "#9DA79E"}" opacity=".55"/>` : ""}
  <g>
    <rect x="${houseX}" y="${base - h1}" width="${houseW}" height="${h1}" fill="${wallA}"/>
    <rect x="${houseX + houseW}" y="${base - h1 - 10}" width="${140}" height="${h1 + 10}" fill="${wallC}"/>
    <rect x="${houseX - 170}" y="${base - h2}" width="170" height="${h2}" fill="${wallB}"/>
    <rect x="${houseX}" y="${base - h1 - 26}" width="${houseW * 0.72}" height="26" fill="${dusk ? "#1F1D1A" : "#BFB29B"}"/>
    <rect x="${houseX - 170}" y="${base - h2 - 18}" width="176" height="18" fill="${dusk ? "#1F1D1A" : "#BFB29B"}"/>
    ${win}
    <rect x="${houseX}" y="${base - 8}" width="${houseW + 140}" height="10" fill="${P.ink}" opacity=".22"/>
    <rect x="${houseX + 40}" y="${base - h1}" width="${houseW * 0.42}" height="${h1}" fill="url(#shade-${name})" opacity=".5"/>
  </g>
  ${foliage}
  <rect y="${base + 40}" width="${W}" height="${H - base - 40}" fill="${P.ink}" opacity="${dusk ? 0.18 : 0.06}"/>
  ${vignette()}
  ${grain(name)}
</svg>`;
}

/* ---------- interior: window light, floor pool, furniture ---------- */
function interior(name, { night = false, warm = true } = {}) {
  const r = rng(name);
  const wall = night ? "#3A342C" : warm ? "#E5DCC9" : "#DED5C2";
  const wallDark = night ? "#2B2620" : "#CFC3AC";
  const floor = night ? "#332C24" : "#C8B89C";
  const horizon = H * 0.62;
  const wx = 420 + r() * 160;
  const ww = 520 + r() * 240;
  const wy = 150;
  const wh = horizon - wy - 40;

  let slats = "";
  const bars = 7;
  for (let i = 1; i < bars; i++) {
    slats += `<rect x="${wx + (ww / bars) * i}" y="${wy}" width="7" height="${wh}" fill="${P.ink}" opacity=".5"/>`;
  }

  let furniture = "";
  for (let i = 0; i < 3; i++) {
    const fw = 180 + r() * 220;
    const fh = 90 + r() * 90;
    const fx = 120 + r() * (W - fw - 240);
    furniture += `<g opacity=".95">
      <rect x="${fx}" y="${horizon - fh}" width="${fw}" height="${fh}" fill="${night ? "#463E33" : "#B9A88C"}"/>
      <rect x="${fx}" y="${horizon - fh}" width="${fw}" height="${fh * 0.18}" fill="${night ? "#54493B" : "#C9B99D"}"/>
      <rect x="${fx + 10}" y="${horizon - fh * 0.1}" width="${fw - 20}" height="10" fill="${P.ink}" opacity=".18"/>
    </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Interior architectural study">
  ${defs(name, P.dusk[2], P.dusk[1], P.dusk[0], 0.5)}
  <rect width="${W}" height="${H}" fill="${wall}"/>
  <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${floor}"/>
  <rect y="${horizon - 14}" width="${W}" height="14" fill="${P.ink}" opacity=".12"/>
  <!-- window -->
  <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="url(#sky-${name})"/>
  <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="url(#sun-${name})" opacity=".9"/>
  <rect x="${wx - 26}" y="${wy - 26}" width="${ww + 52}" height="${wh + 52}" fill="none" stroke="${night ? "#4B4438" : "#B9AB90"}" stroke-width="26"/>
  ${slats}
  ${slats ? `<g transform="translate(${wx - 40} ${horizon + 10}) skewX(-18)">
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${(ww / 7) * i}" y="0" width="${ww / 14}" height="${140}" fill="${P.warm}" opacity="${night ? 0.1 : 0.28}" filter="url(#soft-${name})"/>`).join("")}
  </g>` : ""}
  <rect x="${wx}" y="${horizon + 6}" width="${ww}" height="150" fill="${P.warm}" opacity="${night ? 0.12 : 0.22}" filter="url(#soft-${name})"/>
  ${furniture}
  <rect x="0" y="0" width="${W}" height="${H}" fill="${wallDark}" opacity=".18" filter="url(#soft-${name})"/>
  ${vignette()}
  ${grain(name)}
</svg>`;
}

/* ---------- detail: slats, stair shadow, plaster ---------- */
function detail(name) {
  const r = rng(name);
  let bars = "";
  let x = -80;
  while (x < W + 80) {
    const w = 14 + r() * 26;
    bars += `<rect x="${x}" y="0" width="${w}" height="${H}" fill="${P.ink}" opacity="${0.1 + r() * 0.28}"/>`;
    x += w + 26 + r() * 44;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Material study">
  ${defs(name, P.paper, P.sand, P.clay, 0.4)}
  <rect width="${W}" height="${H}" fill="${P.sand}"/>
  <rect width="${W}" height="${H}" fill="url(#sun-${name})"/>
  ${bars}
  <rect x="0" y="${H * 0.52}" width="${W}" height="${H * 0.48}" fill="${P.warm}" opacity=".12"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#shade-${name})" opacity=".55"/>
  ${vignette()}
  ${grain(name)}
</svg>`;
}

/* ---------- elevation frame: rotating house silhouette ---------- */
function elevation(i, total) {
  const name = `frame${i}`;
  const a = (i / (total - 1)) * Math.PI - Math.PI / 2; // -90° → +90°
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const frontW = 520 * Math.abs(cos) + 120;
  const sideW = 300 * Math.abs(sin) + 60;
  const cx = W / 2;
  const base = 720;
  const hMain = 300;
  const hWing = 190;
  const leftSide = sin < 0;

  const windows = (x, w, h, cols) => {
    let s = "";
    for (let c = 0; c < cols; c++) {
      const cw = w / cols;
      s += `<rect x="${x + cw * c + cw * 0.2}" y="${base - h + 42}" width="${cw * 0.55}" height="${h * 0.52}" fill="${P.ink}" opacity=".82"/>`;
    }
    return s;
  };

  const frontX = leftSide ? cx - frontW / 2 + sideW : cx - frontW / 2 - sideW;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Elevation ${i + 1}">
  ${defs(name, P.sky[0], P.sky[1], P.sky[2], 0.66)}
  <rect width="${W}" height="${H}" fill="url(#sky-${name})"/>
  <rect width="${W}" height="${H}" fill="url(#sun-${name})"/>
  <rect y="${base}" width="${W}" height="${H - base}" fill="${P.stone}"/>
  <rect y="${base}" width="${W}" height="${H - base}" fill="${P.ink}" opacity=".08"/>
  <rect x="${cx - 520}" y="${base + 6}" width="1040" height="120" fill="${P.ink}" opacity=".08" filter="url(#soft-${name})"/>
  <!-- side mass -->
  <rect x="${leftSide ? frontX - sideW : frontX + frontW}" y="${base - hMain + 40}" width="${sideW}" height="${hMain - 40}" fill="${P.clay}"/>
  <rect x="${leftSide ? frontX - sideW : frontX + frontW}" y="${base - hMain + 40}" width="${sideW}" height="${hMain - 40}" fill="${P.ink}" opacity=".18"/>
  <!-- front mass -->
  <rect x="${frontX}" y="${base - hMain}" width="${frontW}" height="${hMain}" fill="${P.sand}"/>
  <rect x="${frontX}" y="${base - hMain}" width="${frontW}" height="18" fill="${P.paper}"/>
  <rect x="${frontX + frontW * 0.55}" y="${base - hMain}" width="${frontW * 0.45}" height="${hMain}" fill="url(#shade-${name})" opacity=".45"/>
  ${windows(frontX, frontW, hMain, Math.max(2, Math.round(frontW / 150)))}
  <!-- lower wing -->
  <rect x="${frontX - 60}" y="${base - hWing}" width="${frontW * 0.62}" height="${hWing}" fill="${P.paper}"/>
  ${windows(frontX - 60, frontW * 0.62, hWing, 3)}
  <rect x="${frontX - 60}" y="${base - hWing}" width="${frontW * 0.62}" height="12" fill="${P.stone}"/>
  ${vignette()}
  ${grain(name)}
</svg>`;
}

const jobs = [
  ["hero.svg", exterior("hero.svg", { dusk: true, trees: 2, elegant: 12 })],
  ["residence-hero.svg", exterior("residence-hero.svg", { trees: 4 })],
  ["patio-front.svg", exterior("patio-front.svg", { trees: 3, pool: true })],
  ["side.svg", exterior("side.svg", { trees: 2 })],
  ["night-side.svg", exterior("night-side.svg", { dusk: true, trees: 3 })],
  ["landscape-house.svg", exterior("landscape-house.svg", { trees: 5 })],
  ["exterior-garden.svg", exterior("exterior-garden.svg", { trees: 6 })],
  ["living-room.svg", interior("living-room.svg")],
  ["kitchen.svg", interior("kitchen.svg", { warm: false })],
  ["detail.svg", detail("detail.svg")],
  ["top.svg", detail("top.svg")],
  ["apartment-living.svg", interior("apartment-living.svg")],
  ["apartment-bedroom.svg", interior("apartment-bedroom.svg", { warm: false })],
  ["apartment-bedroom-2.svg", interior("apartment-bedroom-2.svg", { night: true })],
  ["apartment-tour.svg", interior("apartment-tour.svg")],
  ["cloud-1.svg", detail("cloud-1.svg")],
  ["cloud-2.svg", detail("cloud-2.svg")],
];

for (let i = 0; i < 7; i++) jobs.push([`frame-${i + 1}.svg`, elevation(i, 7)]);

await mkdir(OUT, { recursive: true });
for (const [file, svg] of jobs) {
  await writeFile(`${OUT}/${file}`, svg.trim() + "\n");
}
console.log(`wrote ${jobs.length} svg files to ${OUT}`);
