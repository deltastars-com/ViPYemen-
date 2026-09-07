// =============================================================================
// ViP Yemen — Official app icon generator (zero native deps)
// -----------------------------------------------------------------------------
// Renders the OFFICIAL gold seal badge 1:1:
//   • scalloped metallic-gold edge on a black background
//   • polished gold disc with engraved seed-of-life circle pattern
//   • small crown + large chevron crown motif, engraved
//   • engraved "VIP" / "YEMEN" lettering
// Fonts come from the bundled @fontsource/cairo files (glyph outlines baked
// in), so every build reproduces the identical official icon.
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import opentype from "opentype.js";
import * as hbjs from "harfbuzzjs";

const OUT_DIR = path.resolve("public/icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------- PNG encoder (pure JS) ----------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy ? rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4) : null;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------- Fonts (bundled Cairo → TTF → opentype.js) ----------------
function woff2ttf(buf) {
  const ver = buf.readUInt32BE(0);
  if (ver !== 0x774f4646) throw new Error("expected WOFF"); // 'wOFF'
  const numTables = buf.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = buf.toString("latin1", o, o + 4);
    const offset = buf.readUInt32BE(o + 4);
    const compLen = buf.readUInt32BE(o + 8);
    const origLen = buf.readUInt32BE(o + 12);
    const data = buf.subarray(offset, offset + compLen);
    tables.push({ tag, data: compLen !== origLen ? zlib.inflateSync(data) : Buffer.from(data) });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  const head = Buffer.alloc(12);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt16BE(numTables, 4);
  head.writeUInt16BE(searchRange, 6);
  head.writeUInt16BE(entrySelector, 8);
  head.writeUInt16BE(numTables * 16 - searchRange, 10);
  const out = [head];
  const dirSize = 12 + numTables * 16;
  let dataOffset = dirSize;
  for (const t of tables) {
    const dir = Buffer.alloc(16);
    dir.write(t.tag, 0, "latin1");
    dir.writeUInt32BE(crc32(t.data), 4);
    dir.writeUInt32BE(dataOffset, 8);
    dir.writeUInt32BE(t.data.length, 12);
    t._off = dataOffset;
    dataOffset += t.data.length + ((4 - (t.data.length % 4)) % 4); // 4-byte align
    out.push(dir);
  }
  for (const t of tables) {
    out.push(t.data);
    const pad = (4 - (t.data.length % 4)) % 4;
    if (pad) out.push(Buffer.alloc(pad));
  }
  return Buffer.concat(out);
}

const CAIRO_DIR = path.resolve("node_modules/@fontsource/cairo/files");
function loadFont(subset, weight) {
  const woff = fs.readFileSync(path.join(CAIRO_DIR, `cairo-${subset}-${weight}-normal.woff`));
  return opentype.parse(woff2ttf(woff).buffer.slice(woff2ttf(woff).byteOffset, woff2ttf(woff).byteOffset + woff2ttf(woff).byteLength));
}
const latinFont = loadFont("latin", "900");
const UPEM = latinFont.unitsPerEm;

function latinRun(text, sizePx) {
  const chars = [...text];
  const scale = sizePx / UPEM;
  return chars.map((ch) => {
    const gid = latinFont.charToGlyphIndex(ch);
    const glyph = latinFont.glyphs.get(gid);
    const adv = glyph.advanceWidth * scale;
    const contours = flattenPath(glyph.getPath(0, 0, sizePx), 1);
    return { gid, adv, contours };
  });
}
function totalAdvance(run) {
  return run.reduce((s, g) => s + g.adv, 0);
}

// ---------------- Geometry helpers ----------------
function flattenPath(pathObj, scale) {
  const contours = [];
  let cur = [];
  const push = (x, y) => cur.push([x * scale, y * scale]);
  for (const cmd of pathObj.commands) {
    const v = cmd;
    if (v.type === "M") { if (cur.length >= 3) contours.push(cur); cur = []; push(v.x, v.y); }
    else if (v.type === "L") push(v.x, v.y);
    else if (v.type === "C") {
      const px = cur[cur.length - 1][0], py = cur[cur.length - 1][1];
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, mt = 1 - t;
        const x = mt*mt*mt*px + 3*mt*mt*t*v.x1 + 3*mt*t*t*v.x2 + t*t*t*v.x;
        const y = mt*mt*mt*py + 3*mt*mt*t*v.y1 + 3*mt*t*t*v.y2 + t*t*t*v.y;
        push(x, y);
      }
    } else if (v.type === "Q") {
      const px = cur[cur.length - 1][0], py = cur[cur.length - 1][1];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8, mt = 1 - t;
        const x = mt*mt*px + 2*mt*t*v.x1 + t*t*v.x;
        const y = mt*mt*py + 2*mt*t*v.y1 + t*t*v.y;
        push(x, y);
      }
    } else if (v.type === "Z") { if (cur.length >= 3) contours.push(cur); cur = []; }
  }
  if (cur.length >= 3) contours.push(cur);
  return contours.filter((c) => c.length >= 3);
}
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
const DEG = Math.PI / 180;

// ---------------- Badge layout (512 design space, center 256,256) ----------------
const CX = 256, CY = 256;
const TEETH = 36;
const EDGE_MIN = 234, EDGE_AMP = 14;           // scalloped edge 234..248
const R_RIM_OUT = 222, R_RIM_IN = 208;         // polished inner rim
const R_DISC = 208;                            // main gold disc
const PATTERN_R = 95;                          // seed-of-life circle radius
const PATTERN_D = 95;                          // distance of the 6 petal centers

const GOLD_LIGHT = [248, 228, 150];
const GOLD_MID = [216, 178, 68];
const GOLD_DARK = [138, 102, 34];
const ENGRAVE = [104, 74, 18];                 // dark engraved bronze
const ENGRAVE_SOFT = [124, 92, 26];
const HIGHLIGHT = [252, 240, 190];
const BLACK = [5, 5, 5];

// scallop outer radius
function edgeR(a) {
  return EDGE_MIN + EDGE_AMP * (0.5 + 0.5 * Math.cos(TEETH * a));
}

// seed-of-life engraving: 1 center circle + 6 petals + outer bound ring
const PATTERN_CIRCLES = (() => {
  const cs = [{ cx: CX, cy: CY, r: PATTERN_R }];
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * DEG + 30 * DEG;
    cs.push({ cx: CX + PATTERN_D * Math.cos(a), cy: CY + PATTERN_D * Math.sin(a), r: PATTERN_R });
  }
  return cs;
})();
// crown chevron (big) + small crown above
const CHEVRON = [
  [148, 272], [256, 190], [364, 272], [364, 240], [256, 158], [148, 240],
];
const BARB_L = [[148, 272], [112, 242], [154, 244]];
const BARB_R = [[364, 272], [400, 242], [358, 244]];
const SMALL_CROWN = [[232, 152], [244, 130], [256, 146], [268, 130], [280, 152]];

// engraved text runs
const runVip = latinRun("VIP", 66);
const runYemen = latinRun("YEMEN", 50);

// ---------------- Per-pixel coloring ----------------
function goldMetalColor(x, y) {
  const dx = x - CX, dy = y - CY;
  const a = Math.atan2(dy, dx);
  const f = clamp01((Math.cos(a - (5 * Math.PI) / 4) + 1) / 2);
  const sheen = clamp01((Math.cos((x * 0.8 + y * 0.8) / 40) + 1) / 2) * 0.12;
  return lerpColor(GOLD_DARK, GOLD_LIGHT, clamp01(0.3 + 0.6 * f + sheen));
}

function hitGlyphs(x, y, run, startX, baselineY) {
  for (const pl of run) {
    for (const contour of pl.contours) {
      if (pointInPoly(x, y, contour.map(([gx, gy]) => [gx + pl._ox, gy + pl._oy]))) return true;
    }
  }
  return false;
}
// bake a centered horizontal run at a baseline
function bakeH(run, baselineY, tracking = 0) {
  const total = totalAdvance(run) + tracking * (run.length - 1);
  let x = CX - total / 2;
  for (const g of run) { g._ox = x; g._oy = baselineY; x += g.adv + tracking; }
  return run;
}
bakeH(runVip, 318, 4);
bakeH(runYemen, 380, 3);

function colorAt(x, y, maskable, fgScale) {
  const s = fgScale ?? (maskable ? 0.8 : 1);
  const d0 = Math.hypot(x - CX, y - CY);
  if (d0 > 250 * s) {
    return fgScale != null ? [0, 0, 0, 0] : [5, 5, 5, 255];
  }
  const mx = CX + (x - CX) / s;
  const my = CY + (y - CY) / s;
  const dx = mx - CX, dy = my - CY;
  const d = Math.hypot(dx, dy);
  const a = Math.atan2(dy, dx);

  // black background beyond the scalloped edge
  if (d > edgeR(a)) return [...BLACK, 255];

  // scalloped edge + rim: polished gold with engraved separation lines
  const metal = goldMetalColor(mx, my);

  if (d > R_RIM_OUT) {
    // engraved line between the scallops and the rim
    if (Math.abs(d - (R_RIM_OUT + 2.5)) < 1.4) return [...ENGRAVE, 255];
    return [...metal, 255];
  }

  // engraved rim circles
  if (Math.abs(d - 214) < 1.6) return [...ENGRAVE_SOFT, 255];
  if (Math.abs(d - 202) < 1.4) return [...ENGRAVE_SOFT, 255];

  // disc
  if (d <= R_RIM_IN) {
    // seed-of-life engraving (stroke width 3 with soft shading)
    for (const c of PATTERN_CIRCLES) {
      const dd = Math.hypot(mx - c.cx, my - c.cy);
      if (Math.abs(dd - c.r) < 1.8) return [...ENGRAVE_SOFT, 255];
      if (dd >= c.r && dd < c.r + 2.2) return [...lerpColor(metal, HIGHLIGHT, 0.5), 255];
    }
    // crown chevron + barbs + small crown (engraved dark with highlight top)
    const chev = pointInPoly(mx, my, CHEVRON) || pointInPoly(mx, my, BARB_L) || pointInPoly(mx, my, BARB_R);
    if (chev) return [...ENGRAVE, 255];
    if (pointInPoly(mx, my, SMALL_CROWN)) return [...ENGRAVE, 255];

    // engraved lettering
    if (hitGlyphs(mx, my, runVip)) return [...ENGRAVE, 255];
    if (hitGlyphs(mx, my, runYemen)) return [...ENGRAVE, 255];

    return [...metal, 255];
  }

  return [...metal, 255];
}

// ---------------- Render ----------------
function render(size, { maskable = false, fgScale } = {}) {
  const SS = 4;
  const canvas = Buffer.alloc(size * size * 4);
  const scale = size / 512;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / scale;
          const y = (py + (sy + 0.5) / SS) / scale;
          const c = colorAt(x, y, maskable, fgScale);
          r += c[0]; g += c[1]; b += c[2]; a += c[3];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      canvas[i] = Math.round(r / n);
      canvas[i + 1] = Math.round(g / n);
      canvas[i + 2] = Math.round(b / n);
      canvas[i + 3] = Math.round(a / n);
    }
  }
  return canvas;
}

function writeIcon(file, size, opts) {
  const canvas = render(size, opts);
  const png = encodePNG(size, size, canvas);
  fs.writeFileSync(path.join(OUT_DIR, file), png);
  console.log(`✔ ${file} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

writeIcon("icon-192.png", 192, {});
writeIcon("icon-512.png", 512, {});
writeIcon("icon-maskable-512.png", 512, { maskable: true });
writeIcon("apple-touch-icon.png", 180, { maskable: true });

// ---------------- Android app icons + splash ----------------
const ANDROID_RES = path.resolve("android/app/src/main/res");
if (fs.existsSync(ANDROID_RES)) {
  const mipmapSizes = {
    "mipmap-mdpi": { launcher: 48, foreground: 108 },
    "mipmap-hdpi": { launcher: 72, foreground: 162 },
    "mipmap-xhdpi": { launcher: 96, foreground: 216 },
    "mipmap-xxhdpi": { launcher: 144, foreground: 324 },
    "mipmap-xxxhdpi": { launcher: 192, foreground: 432 },
  };
  for (const [dir, { launcher, foreground }] of Object.entries(mipmapSizes)) {
    const out = path.join(ANDROID_RES, dir);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "ic_launcher.png"), encodePNG(launcher, launcher, render(launcher, {})));
    fs.writeFileSync(path.join(out, "ic_launcher_round.png"), encodePNG(launcher, launcher, render(launcher, {})));
    const fg = render(foreground, { maskable: true, fgScale: 0.62 });
    fs.writeFileSync(path.join(out, "ic_launcher_foreground.png"), encodePNG(foreground, foreground, fg));
  }
  console.log("✔ Android adaptive + legacy icons (mdpi→xxxhdpi)");
  const splashOut = path.join(ANDROID_RES, "drawable");
  fs.mkdirSync(splashOut, { recursive: true });
  fs.writeFileSync(path.join(splashOut, "splash.png"), encodePNG(512, 512, render(512, { maskable: true })));
  console.log("✔ Android splash.png");
}

// ---------------- iOS app icon (1024) ----------------
const IOS_ICON_DIR = path.resolve("ios/App/App/Assets.xcassets/AppIcon.appiconset");
if (fs.existsSync(IOS_ICON_DIR)) {
  fs.writeFileSync(
    path.join(IOS_ICON_DIR, "AppIcon-512@2x.png"),
    encodePNG(1024, 1024, render(1024, { maskable: true }))
  );
  console.log("✔ iOS AppIcon 1024");
}

// ---------------- favicon.svg (font-independent) ----------------
function polyPath(poly) {
  return poly.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
}
function scallopPath() {
  const pts = [];
  for (let i = 0; i <= 720; i++) {
    const a = (i / 720) * 2 * Math.PI;
    const r = edgeR(a);
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return polyPath(pts);
}
function runSvg(run, fill) {
  return run
    .map((g) =>
      g.contours
        .map((c) => `<path d="${polyPath(c)}" fill="${fill}" transform="translate(${g._ox.toFixed(1)} ${g._oy.toFixed(1)})"/>`)
        .join("")
    )
    .join("");
}
const patternSvg = PATTERN_CIRCLES.map(
  (c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="none" stroke="#7c5c1a" stroke-width="3"/>`
).join("");

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8e496"/>
      <stop offset="45%" stop-color="#d8b244"/>
      <stop offset="100%" stop-color="#8a6622"/>
    </linearGradient>
  </defs>
  <path d="${scallopPath()}" fill="url(#gold)"/>
  <circle cx="256" cy="256" r="214" fill="none" stroke="#684a12" stroke-width="2.4"/>
  <circle cx="256" cy="256" r="202" fill="none" stroke="#7c5c1a" stroke-width="2"/>
  ${patternSvg}
  <path d="${polyPath(CHEVRON)}" fill="#684a12"/>
  <path d="${polyPath(BARB_L)}" fill="#684a12"/>
  <path d="${polyPath(BARB_R)}" fill="#684a12"/>
  <path d="${polyPath(SMALL_CROWN)}" fill="#684a12"/>
  ${runSvg(runVip, "#684a12")}
  ${runSvg(runYemen, "#684a12")}
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, "favicon.svg"), favicon);
console.log("✔ favicon.svg");

// Sanity probes
{
  const canvas = render(512, {});
  let gold = 0, dark = 0, black = 0;
  for (let i = 0; i < canvas.length; i += 4) {
    const r = canvas[i], g = canvas[i + 1], b = canvas[i + 2], al = canvas[i + 3];
    if (al < 10) black++;
    else if (r > 150 && g > 110 && b < 140) gold++;
    else if (r < 140 && g < 110) dark++;
  }
  console.log(`Probes: goldPx=${gold} engravedPx=${dark} bgPx=${black}`);
}
