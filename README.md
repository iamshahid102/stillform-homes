# STILL / FORM — architectural residence site (clone study)

A rebuilt replica of the **design system and page structure** of `stillform.homes`:
same fonts, same palette, same grid, same section sequence, same motion behaviour.
Plain HTML/CSS/JS — no install, no build step.

```bash
node tools/serve.mjs 4173     # → http://localhost:4173
```

---

## 1. What the reference actually is (measured)

| Area | Finding |
|---|---|
| Framework | Next.js (App Router, Turbopack chunks, SSR HTML) |
| Styles | One ~70 KB global stylesheet; **layout itself is inline Tailwind utilities** |
| Display type | **Instrument Serif** 400 / italic, self-hosted via `next/font` |
| UI type | **Familjen Grotesk** variable 400–700, self-hosted |
| Palette | bone `#EDE6D6`, warm near-black `#2A2725`, sand `#DDD2BC`, olive `#6E7261` |
| Imagery | 17 WebP files under `/assets/images/` |
| Motion | JS-driven throughout (only `ping`/`pulse` keyframes in CSS) |
| Stage technique | Pinned `height:100svh` blocks inside tall scroll sections |

The two woff2 faces in `assets/fonts/` are the **same binaries the reference serves**
(Instrument Serif latin + italic, Familjen Grotesk latin). Both are SIL Open Font
License, so redistribution is permitted. They are linked with `@font-face` and
preloaded, so type renders identically and offline.

## 2. Replicated design tokens

```
bone / paper     #EDE6D6  #F4EEE1
ink              #2A2725          rule: rgba(42,39,37,.2)
sand / olive     #DDD2BC  #6E7261

hero h1          serif  clamp(2.75rem,12vw,4.5rem) / 94%      md: 5rem
about statement  sans   clamp(1.75rem,7vw,2.5rem) / 1.05      lg: 5.2vw / 80%
marquee          sans   clamp(2.5rem,10vw,8rem)   weight 500
structure title  sans   1.875rem → 2.25rem → 3.75rem / 1     tracking -.04em
structure count  sans   2.25rem → 3rem → 6rem                tabular-nums
slide h2         sans   clamp(2rem,8vw,3.75rem) / .95        lg: 4.4vw
tone heading     serif  clamp(2.25rem,9vw,8rem) / .94
apartment h2     sans   clamp(2.75rem,12vw,5.5rem) / .92     lg: 7vw
room h3          sans   clamp(1.75rem,6.5vw,2.75rem) / .98   lg: 2.8vw
tour h2          sans   clamp(2.75rem,12vw,5.5rem) / .9      lg: 7.5vw
footer h2        serif  clamp(3rem,13vw,7rem) / .88          lg: clamp(2.75rem,8vw,7rem)
labels           10–11px uppercase, .18–.24em tracking
```

Layout constants copied across: hero head `left 6%/2.5rem`, `top 16%` → `7%` at lg;
meta grid 2×2 at `bottom 13%`; about grid 12 columns with a 2/10 split at lg; slides
stage padded `.75rem`/`1.25rem` with a 1fr/1fr text-over-image split; apartment panel
`left 6% right 6% top 56% bottom 16%` → `left 74% bottom 24%` at lg; tour box
`left 4% top 12% width 92% height 70%`; footer as a bordered `100svh` frame,
`rounded 20px → 30px`, ink at 20% opacity.

## 3. Section sequence (same order as the reference)

1. Fixed nav — wordmark, MENU + 2×2 dot grid, right-aligned rolling menu
2. Full-bleed hero, black/35 veil, left-aligned display type, 2×2 meta grid, closing line
3. About — pinned 100svh with masked word-by-word statement, inline image slot, rule, supporting copy, flanking tiles
4. Marquee + structure viewer — huge sans belt, then a full-bleed dark elevation stage with a 7-stop rail, drag hint, `Full View / 01 of 07` bar and ticked progress
5. Residence 01 slides — two 50/50 text-over-image frames with pill counters
6. Tone transition — pinned serif statement
7. Residence 02 — three cross-fading rooms over one image stage, hero title, panel copy, `01 / 03` rolling counter
8. Tour — inset framed stage with WASD/E/Q key legend and outline CTA
9. Footer — bordered frame, serif sign-off, two link columns, local clock

## 4. Motion

| Effect | Implementation |
|---|---|
| Loader | rAF counter, curtain lift, 4.2 s hard fail-safe |
| Line reveals | `translateY(108%)` inside clipped masks, staggered by `--d` |
| Statement | runtime word split into per-word masks, 28 ms stagger |
| Character reveals | runtime split into per-character masks inside nowrap word wrappers (`data-chars`) |
| Pinned stages | one rAF scroll pass; progress = `-rect.top / (height − vh)` |
| Marquee → viewer | belt drifts on scroll; viewer opens past 46% of the stage |
| Elevation viewer | Pointer Events, frame handover, 7-dot rail, ←/→ keys, name/count flip |
| Residence slides | frame handover + progress-driven image drift (`--sp`) |
| Apartment | 3 images + copy blocks on scroll, rolling counter column |
| Nav | hairline + blur past the hero, hides on scroll-down |
| Smoke overlays | two procedurally generated billow sheets per section, drifting on scroll + a slow 34 s CSS drift |
| Ink dissolve | `assets/js/smoke.js`: raw WebGL, domain-warped fbm threshold peels one image into the next |
| Hover language | line sweep on links, tile rotate/zoom, pill + dot expansion, kbd fill, footer arrow slide, magnetic CTA |
| Ambient | hero settles from `scale(1.06)`, tour photograph slow ken-burns |

### The smoke

Two independent layers, both original artwork generated by `tools/gen-smoke.mjs`:

1. **Cloud sheets** (`assets/img/smoke-*.png`) — value-noise fbm pushed through a
domain warp, thresholded into billows, edge-faded, upscaled and blurred. Four files:
two shapes, each in a bone tone (about) and a white tone (residence 02). They sit over
the about tiles and the apartment photographs (under the copy), fade in with the
section, and shift with scroll progress (`--c`).

2. **Ink dissolve** — a ~150-line WebGL shader with no library behind it. A fullscreen
triangle samples the incoming photograph with cover-fit maths, then cuts it away with
a noise threshold plus a warm rim where the ink is peeling; used for the hero on load
and for the about card, slides, apartment rooms and the viewer opening. The engine
hides the underlying `<img>` while it draws and restores it on completion, and it is
entirely skipped when WebGL is unavailable or motion is reduced — the CSS cross-fades
still do the job.

Everything degrades under `prefers-reduced-motion`, and all content is visible
without JS (the loader is the only thing that depends on it).

## 5. Imagery

23 WebP files in `assets/img/`, **licensed stock photography from Pexels** (Pexels
licence — free for commercial and personal use, attribution not required).

```bash
node tools/install-images.mjs     # download → crop → encode → IMAGE-CREDITS.md
```

The `MANIFEST` at the top of that file maps every slot to a Pexels photo id and an
output size, so any image can be re-picked by editing one line. Sources are cached in
`.cache/src/`, so re-crops do not re-download. Every slot is cropped to its own aspect
ratio (`hero` 3:2, tiles 4:3, viewer frames 16:10, rooms 16:9) and saturation is
pulled to `0.92` so the set sits inside the bone/sand palette. 3.9 MB total at q82.

The seven viewer frames are a set of houses rather than one building rotated — the
reference rotates a single residence, which is not something stock photography can
reproduce. Their labels (`Water Court`, `Living Volume`, …) describe the actual frames.

Dev-only helpers (nothing they use ships with the site):

```bash
node tools/label-sheet.mjs 31737861 36394726     # ids → labelled contact sheet
node tools/shoot.mjs http://localhost:4173/ 0:hero 3200:viewer   # screenshots at scroll
node tools/shoot.mjs http://localhost:4173/ 0:hero --w 390 --h 844  # mobile
```

`sharp` and `puppeteer-core` are devDependencies; `puppeteer-core` drives the Chrome
that is already installed, so no browser download. `tools/gen-placeholders.mjs`
still regenerates the original code-drawn SVG studies if you want to go back to them.

```bash
node tools/gen-smoke.mjs          # regenerate the cloud/smoke sheets (532 kB, 4 files)
```

## 6. What is deliberately not copied

- **Their photographs.** The 17 WebP files are the author's work, so this build ships
  licensed photography instead (§5). If you hold the rights to the originals, drop them
  in at the same filenames and the layout needs no changes.
- **Their prose.** Section order, label/headline/paragraph cadence and spec lists are
  reproduced; the sentences themselves are written for this study.

The wordmark `STILL / FORM` is used here only as a local study fixture so the type
sizing and lockup match. Replace it (mark, menu, footer, `<title>`) before this is
published anywhere.

All other assets in this folder — layout, CSS, JS, artwork, font subsetting — are
original or openly licensed.
