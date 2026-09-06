// =============================================================================
// ViP Yemen — Official app icon generator (zero native deps)
// -----------------------------------------------------------------------------
// Renders the official badge: metallic gold ring, black field with dot
// texture, arched "VIPSERVICESYEMEN" (top), black Arabic tagline (bottom),
// circular English tagline ring, and the eagle emblem in the center.
//
// Text is converted to outlines from the bundled @fontsource/cairo fonts
// (WOFF -> TTF via zlib, outlines via opentype.js, Arabic shaped via
// HarfBuzz WASM) so icons render identically everywhere — no system fonts.
// =============================================================================
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import * as hbjs from "harfbuzzjs";

const OUT_DIR = path.resolve("public/icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------- PNG encoder ----------------
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
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * stride + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------- WOFF -> TTF ----------------
function calcChecksum(buf) {
  const padded = Buffer.alloc(Math.ceil(buf.length / 4) * 4);
  buf.copy(padded);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum >>> 0;
}

function woff2ttf(buf) {
  const ver = buf.readUInt32BE(0);
  if (ver !== 0x774f4646) throw new Error("not a WOFF file");
  const numTables = buf.readUInt16BE(12);
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = buf.toString("latin1", o, o + 4);
    const offset = buf.readUInt32BE(o + 4);
    const compLen = buf.readUInt32BE(o + 8);
    const origLen = buf.readUInt32BE(o + 12);
    let data;
    if (compLen === origLen) data = Buffer.from(buf.subarray(offset, offset + compLen));
    else data = zlib.inflateSync(buf.subarray(offset, offset + compLen));
    tables.push({ tag, data });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = Math.pow(2, entrySelector) * 16;
  const rangeShift = numTables * 16 - searchRange;
  const head = Buffer.alloc(12);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt16BE(numTables, 4);
  head.writeUInt16BE(searchRange, 6);
  head.writeUInt16BE(entrySelector, 8);
  head.writeUInt16BE(rangeShift, 10);
  let offset = 12 + 16 * numTables;
  const out = [head];
  for (const t of tables) {
    const dir = Buffer.alloc(16);
    dir.write(t.tag, 0, "latin1");
    dir.writeUInt32BE(calcChecksum(t.data), 4);
    dir.writeUInt32BE(offset, 8);
    dir.writeUInt32BE(t.data.length, 12);
    out.push(dir);
    offset += t.data.length;
  }
  for (const t of tables) out.push(t.data);
  return Buffer.concat(out);
}

// ---------------- Fonts ----------------
const CAIRO_DIR = path.resolve("node_modules/@fontsource/cairo/files");
function loadFont(subset, weight) {
  const woff = fs.readFileSync(path.join(CAIRO_DIR, `cairo-${subset}-${weight}-normal.woff`));
  return opentype.parse(woff2ttf(woff));
}
const latinFont = loadFont("latin", "900");
const arabicFont = loadFont("arabic", "700");
const UPEM = latinFont.unitsPerEm;

// HarfBuzz Arabic shaping
const hbBlob = new hbjs.Blob(woff2ttf(fs.readFileSync(path.join(CAIRO_DIR, "cairo-arabic-700-normal.woff"))));
const hbFace = new hbjs.Face(hbBlob);
const hbFont = new hbjs.Font(hbFace);
hbFont.setScale(UPEM, UPEM);

function shapeArabic(text) {
  const buf = new hbjs.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hbjs.shape(hbFont, buf);
  const infos = buf.getGlyphInfos();
  const positions = buf.getGlyphPositions();
  const out = infos.map((info, i) => ({
    gid: info.codepoint,
    xAdvance: positions[i].xAdvance,
    yAdvance: positions[i].yAdvance,
    xOffset: positions[i].xOffset,
    yOffset: positions[i].yOffset,
  }));
  return out;
}

// ---------------- Glyph outline flattening ----------------
function flattenPath(pathObj, scale) {
  const contours = [];
  let cur = null;
  const push = (x, y) => cur.push([x * scale, y * scale]);
  for (const cmd of pathObj.commands) {
    const v = cmd;
    if (v.type === "M") {
      cur = [];
      contours.push(cur);
      push(v.x, v.y);
    } else if (v.type === "L") {
      push(v.x, v.y);
    } else if (v.type === "Q") {
      const qx = v.x1, qy = v.y1, x = v.x, y = v.y;
      const px = cur[cur.length - 1][0], py = cur[cur.length - 1][1];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const mt = 1 - t;
        push(
          mt * mt * px + 2 * mt * t * qx + t * t * x,
          mt * mt * py + 2 * mt * t * qy + t * t * y
        );
      }
    } else if (v.type === "C") {
      const px = cur[cur.length - 1][0], py = cur[cur.length - 1][1];
      const { x1, y1, x2, y2, x, y } = v;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const mt = 1 - t;
        push(
          mt * mt * mt * px + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x,
          mt * mt * mt * py + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y
        );
      }
    }
  }
  return contours.filter((c) => c.length >= 3);
}

function glyphOutlines(font, gid, sizePx) {
  const glyph = font.glyphs.get(gid);
  const p = glyph.getPath(0, 0, sizePx);
  return flattenPath(p, 1);
}

function glyphPathData(font, gid, sizePx) {
  const glyph = font.glyphs.get(gid);
  return glyph.getPath(0, 0, sizePx).toPathData(2);
}

const outlineCache = new Map();
function outlinesFor(font, gid, sizePx) {
  const key = `${font === arabicFont ? "ar" : "la"}:${gid}:${sizePx}`;
  if (!outlineCache.has(key)) outlineCache.set(key, glyphOutlines(font, gid, sizePx));
  return outlineCache.get(key);
}
const pathDataCache = new Map();
function pathDataFor(font, gid, sizePx) {
  const key = `${font === arabicFont ? "ar" : "la"}:${gid}:${sizePx}`;
  if (!pathDataCache.has(key)) pathDataCache.set(key, glyphPathData(font, gid, sizePx));
  return pathDataCache.get(key);
}

// ---------------- Geometry helpers ----------------
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ---------------- Badge layout (512 design space, center 256,256) ----------------
const CX = 256, CY = 256;
const R_OUTER = 250, R_INNER = 224; // ring band
const R_FIELD = 221;                 // black field
const R_TEXT_LATIN = 240;            // baseline radius, top arc
const R_TEXT_ARABIC = 242;           // baseline radius, bottom arc
const R_MID_TOP = 191, R_MID_BOT = 145; // middle thin rings
const R_MID_TEXT = 168;              // middle tagline text radius
const R_EMBLEM = 136;                // emblem thin ring

const GOLD_LIGHT = [245, 227, 162];
const GOLD_MID = [212, 175, 55];
const GOLD_DARK = [143, 107, 34];
const GOLD_TEXT = [255, 236, 176];
const GOLD_TEXT_SHADOW = [94, 70, 12];
const FIELD = [11, 11, 18];
const DOT = [32, 39, 56];
const BROWN_TOP = [154, 100, 49];
const BROWN_BOT = [104, 63, 24];
const WHITE_FEATHER = [242, 239, 228];
const GOLD_ACCENT = [233, 185, 60];
const BLACK = [4, 4, 6];

// Eagle emblem (facing left) — scaled to fit inside the emblem ring
const EAGLE_RAW = {
  wings: [
    [
      [240, 172], [200, 140], [156, 118], [120, 124], [114, 140], [136, 150],
      [124, 170], [160, 166], [148, 192], [186, 184], [180, 210], [216, 200],
      [232, 190], [242, 180],
    ],
    [
      [272, 172], [312, 140], [356, 118], [392, 124], [398, 140], [376, 150],
      [388, 170], [352, 166], [364, 192], [326, 184], [332, 210], [296, 200],
      [280, 190], [270, 180],
    ],
  ],
  body: [[256, 150], [234, 166], [230, 198], [242, 232], [252, 248], [256, 254], [260, 248], [270, 232], [282, 198], [278, 166]],
  head: { cx: 238, cy: 136, r: 15 },
  chest: [[228, 152], [250, 148], [256, 166], [240, 176], [222, 166]],
  beak: [[233, 131], [203, 137], [215, 147], [229, 142]],
  eye: { cx: 230, cy: 133, r: 2.1 },
  tail: [[246, 242], [234, 258], [242, 272], [254, 280], [262, 278], [272, 268], [266, 244]],
  talons: [
    [[248, 282], [252, 294], [258, 282]],
    [[254, 284], [259, 296], [265, 284]],
  ],
};
function scaleEagle(es) {
  const sp = (p) => [CX + (p[0] - CX) * es, CY + (p[1] - CY) * es];
  const EAGLE = {
    wings: EAGLE_RAW.wings.map((w) => w.map(sp)),
    body: EAGLE_RAW.body.map(sp),
    head: { cx: CX + (EAGLE_RAW.head.cx - CX) * es, cy: CY + (EAGLE_RAW.head.cy - CY) * es, r: EAGLE_RAW.head.r * es },
    chest: EAGLE_RAW.chest.map(sp),
    beak: EAGLE_RAW.beak.map(sp),
    eye: { cx: CX + (EAGLE_RAW.eye.cx - CX) * es, cy: CY + (EAGLE_RAW.eye.cy - CY) * es, r: EAGLE_RAW.eye.r * es },
    tail: EAGLE_RAW.tail.map(sp),
    talons: EAGLE_RAW.talons.map((t) => t.map(sp)),
  };
  return EAGLE;
}
const EAGLE = scaleEagle(0.66);

// ---------------- Text runs ----------------
const TEXT_LATIN = "VIPSERVICESYEMEN";
const TEXT_ARABIC = "للتوفير والتسويق الإلكتروني والخدمات العامة";
const TEXT_MIDDLE = "* FOR EMPLOYMENT, E-MARKETING & GENERAL SERVICES * ( ViP )";

function latinRun(text, sizePx) {
  const chars = [...text];
  const scale = sizePx / UPEM;
  const glyphs = chars.map((ch) => {
    const gid = latinFont.charToGlyphIndex(ch);
    const adv = latinFont.glyphs.get(gid).advanceWidth * scale;
    return { gid, adv, contours: outlinesFor(latinFont, gid, sizePx), path: pathDataFor(latinFont, gid, sizePx) };
  });
  return glyphs;
}

function arabicRun(text, sizePx) {
  const scale = sizePx / UPEM;
  return shapeArabic(text).map((g) => ({
    gid: g.gid,
    adv: g.xAdvance * scale,
    xOff: g.xOffset * scale,
    yOff: -g.yOffset * scale, // hb is y-up
    contours: outlinesFor(arabicFont, g.gid, sizePx),
    path: pathDataFor(arabicFont, g.gid, sizePx),
  }));
}

// Build runs once (design-space sizes)
const SIZE_LATIN = 30;
const SIZE_ARABIC = 24;
const SIZE_MIDDLE = 19.5;
let runLatin = latinRun(TEXT_LATIN, SIZE_LATIN);
let runArabic = arabicRun(TEXT_ARABIC, SIZE_ARABIC);
let runMiddle = latinRun(TEXT_MIDDLE, SIZE_MIDDLE);

function totalAdvance(run) {
  return run.reduce((s, g) => s + g.adv, 0);
}

// Auto-fit middle tagline to a full loop
let MIDDLE_ROT = 0;
{
  const targetAngle = Math.PI * 2 - 0.4;
  let angle = totalAdvance(runMiddle) / R_MID_TEXT;
  const ratio = targetAngle / angle;
  if (Math.abs(ratio - 1) > 0.03) {
    const size = Math.min(SIZE_MIDDLE * ratio, 38);
    runMiddle = latinRun(TEXT_MIDDLE, size);
    angle = totalAdvance(runMiddle) / R_MID_TEXT;
  }
  // Rotate the run so the "( ViP )" cluster sits centered at the bottom
  const idx = TEXT_MIDDLE.indexOf("( ViP )");
  const advBefore = runMiddle.slice(0, idx).reduce((s, g) => s + g.adv, 0);
  const clusterAdv = runMiddle.slice(idx, idx + "( ViP )".length).reduce((s, g) => s + g.adv, 0);
  const thetaStart = (3 * Math.PI) / 2 - angle / 2;
  const clusterMid = thetaStart + (advBefore + clusterAdv / 2) / R_MID_TEXT;
  MIDDLE_ROT = Math.PI / 2 - clusterMid;
}

// Auto-fit arcs
{
  const maxArc = Math.PI * 0.92;
  const maxArcAr = Math.PI * 0.78;
  let a = totalAdvance(runLatin) / R_TEXT_LATIN;
  if (a > maxArc) runLatin = latinRun(TEXT_LATIN, SIZE_LATIN * (maxArc / a));
  a = totalAdvance(runArabic) / R_TEXT_ARABIC;
  if (a > maxArcAr) runArabic = arabicRun(TEXT_ARABIC, SIZE_ARABIC * (maxArcAr / a));
}

// Glyph placement along an arc: theta increases along the arc, glyph local
// x-axis = tangent, y-axis (down) points toward the circle center (tops
// outward). Rotation alpha = theta + PI/2.
function placeRun(run, R, theta0) {
  let theta = theta0;
  const placed = [];
  for (const g of run) {
    placed.push({ ...g, theta });
    theta += g.adv / R;
  }
  return placed;
}

const placedLatin = placeRun(runLatin, R_TEXT_LATIN, (3 * Math.PI) / 2 - totalAdvance(runLatin) / R_TEXT_LATIN / 2);
const placedArabic = placeRun(runArabic, R_TEXT_ARABIC, Math.PI / 2 - totalAdvance(runArabic) / R_TEXT_ARABIC / 2);
const placedMiddle = placeRun(runMiddle, R_MID_TEXT, (3 * Math.PI) / 2 - totalAdvance(runMiddle) / R_MID_TEXT / 2 + MIDDLE_ROT);

// Precompute transformed outlines per placed glyph (design space)
function bakeRun(placed, R) {
  for (const pl of placed) {
    pl.R = R;
    const ca = Math.cos(pl.theta + Math.PI / 2);
    const sa = Math.sin(pl.theta + Math.PI / 2);
    const bx = CX + R * Math.cos(pl.theta);
    const by = CY + R * Math.sin(pl.theta);
    const ox = (pl.xOff ?? 0);
    const oy = (pl.yOff ?? 0);
    pl.baked = pl.contours.map((contour) =>
      contour.map(([px, py]) => {
        const lx = px + ox;
        const ly = py + oy;
        return [lx * ca - ly * sa + bx, lx * sa + ly * ca + by];
      })
    );
    // bbox
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const c of pl.baked) for (const [x, y] of c) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    pl.bbox = [minX, minY, maxX, maxY];
  }
  return placed;
}

bakeRun(placedLatin, R_TEXT_LATIN);
bakeRun(placedArabic, R_TEXT_ARABIC);
bakeRun(placedMiddle, R_MID_TEXT);

// ---------------- Per-pixel coloring ----------------
function goldRingColor(x, y) {
  const d = Math.hypot(x - CX, y - CY);
  const a = Math.atan2(y - CY, x - CX);
  const f = clamp01((Math.cos(a - (-(3 * Math.PI) / 4)) + 1) / 2);
  let c = lerpColor(GOLD_DARK, GOLD_LIGHT, 0.35 + 0.65 * f);
  // edge shading
  const edge = Math.min(R_OUTER - d, d - R_INNER);
  if (edge < 2.5) c = lerpColor(c, [70, 52, 14], (2.5 - edge) / 2.5);
  return c;
}

function hitGlyphs(x, y, run) {
  for (const pl of run) {
    const [minX, minY, maxX, maxY] = pl.bbox;
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    let crossings = 0;
    for (const contour of pl.baked) if (pointInPoly(x, y, contour)) crossings++;
    if (crossings % 2 === 1) return pl;
  }
  return null;
}

// The shadow underlay for the top Latin text (glyphs 2.5px larger, dark)
const runLatinShadow = latinRun(TEXT_LATIN, SIZE_LATIN + 2.5);
const placedLatinShadow = bakeRun(placeRun(runLatinShadow, R_TEXT_LATIN, (3 * Math.PI) / 2 - totalAdvance(runLatinShadow) / R_TEXT_LATIN / 2), R_TEXT_LATIN);

function colorAt(x, y, maskable) {
  // Maskable: full-bleed navy behind a scaled badge (safe zone)
  const s = maskable ? 0.78 : 1;
  const d0 = Math.hypot(x - CX, y - CY);
  if (maskable && d0 > R_OUTER * s) return [13, 17, 30, 255];
  const mx = CX + (x - CX) / s;
  const my = CY + (y - CY) / s;

  const d = Math.hypot(mx - CX, my - CY);

  // Ring text is checked first (glyphs may spill across band/field edges)
  const latBright = hitGlyphs(mx, my, placedLatin);
  if (latBright) return [...GOLD_TEXT, 255];
  if (hitGlyphs(mx, my, placedLatinShadow)) return [...GOLD_TEXT_SHADOW, 255];
  if (hitGlyphs(mx, my, placedArabic)) return [23, 18, 7, 255];

  // Ring band
  if (d <= R_OUTER && d >= R_INNER) {
    return [...goldRingColor(mx, my), 255];
  }

  // Black field (extends to the ring's inner edge)
  if (d <= R_INNER) {
    // thin gold rings
    for (const [rr, w] of [[R_MID_TOP, 1.7], [R_MID_BOT, 1.6], [R_EMBLEM, 2.1]]) {
      if (Math.abs(d - rr) < w) return [...GOLD_MID, 255];
    }

    // eagle emblem (first hit wins)
    const brownHit =
      pointInPoly(mx, my, EAGLE.body) ||
      pointInPoly(mx, my, EAGLE.wings[0]) ||
      pointInPoly(mx, my, EAGLE.wings[1]);
    if (brownHit) {
      const t = clamp01((my - 110) / 170);
      return [...lerpColor(BROWN_TOP, BROWN_BOT, t), 255];
    }
    if (Math.hypot(mx - EAGLE.head.cx, my - EAGLE.head.cy) <= EAGLE.head.r) return [...WHITE_FEATHER, 255];
    if (pointInPoly(mx, my, EAGLE.chest)) return [...lerpColor(WHITE_FEATHER, [226, 222, 205], 0.25), 255];
    if (pointInPoly(mx, my, EAGLE.tail)) return [...WHITE_FEATHER, 255];
    for (const talon of EAGLE.talons) if (pointInPoly(mx, my, talon)) return [...GOLD_ACCENT, 255];
    if (pointInPoly(mx, my, EAGLE.beak)) return [...GOLD_ACCENT, 255];
    if (Math.hypot(mx - EAGLE.eye.cx, my - EAGLE.eye.cy) <= EAGLE.eye.r) return [...BLACK, 255];

    // middle tagline text
    const mid = hitGlyphs(mx, my, placedMiddle);
    if (mid) return [...lerpColor(GOLD_MID, [230, 201, 92], 0.55), 255];

    // subtle dot texture
    const gx = Math.floor(mx / 15) * 15;
    const gy = Math.floor(my / 15) * 15;
    if (Math.hypot(mx - gx, my - gy) < 1.35 && d < R_FIELD - 2) return [...DOT, 255];

    // black field base
    return [...FIELD, 255];
  }

  return [0, 0, 0, 0];
}

// ---------------- Render ----------------
function render(size, { maskable = false } = {}) {
  const SS = 4;
  const canvas = new Uint8Array(size * size * 4);
  const scale = size / 512;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / scale;
          const y = (py + (sy + 0.5) / SS) / scale;
          const c = colorAt(x, y, maskable);
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
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
  };
  for (const [dir, size] of Object.entries(mipmapSizes)) {
    const out = path.join(ANDROID_RES, dir);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "ic_launcher.png"), encodePNG(size, size, render(size, {})));
    fs.writeFileSync(path.join(out, "ic_launcher_foreground.png"), encodePNG(size, size, render(size, { maskable: true })));
    fs.writeFileSync(path.join(out, "ic_launcher_round.png"), encodePNG(size, size, render(size, {})));
  }
  console.log("✔ Android mipmap icons (mdpi→xxxhdpi)");
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
function polygonPath(poly) {
  return poly.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";
}
function glyphGroup(pl) {
  const ca = Math.cos(pl.theta + Math.PI / 2);
  const sa = Math.sin(pl.theta + Math.PI / 2);
  const bx = CX + pl.R * Math.cos(pl.theta);
  const by = CY + pl.R * Math.sin(pl.theta);
  const deg = ((pl.theta + Math.PI / 2) * 180) / Math.PI;
  const path = `<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${deg.toFixed(1)})"><path d="${pl.path}" fill="#ffe9a8"/></g>`;
  void ca; void sa;
  return path;
}
const shadowLatinGroup = placedLatinShadow.map((pl) => {
  const deg = ((pl.theta + Math.PI / 2) * 180) / Math.PI;
  const bx = CX + pl.R * Math.cos(pl.theta);
  const by = CY + pl.R * Math.sin(pl.theta);
  return `<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${deg.toFixed(1)})"><path d="${pl.path}" fill="#6b500f"/></g>`;
}).join("");
const arabicGroup = placedArabic.map((pl) => {
  const deg = ((pl.theta + Math.PI / 2) * 180) / Math.PI;
  const bx = CX + pl.R * Math.cos(pl.theta);
  const by = CY + pl.R * Math.sin(pl.theta);
  const ox = pl.xOff ?? 0, oy = pl.yOff ?? 0;
  return `<g transform="translate(${(bx + ox).toFixed(1)} ${(by + oy).toFixed(1)}) rotate(${deg.toFixed(1)})"><path d="${pl.path}" fill="#171207"/></g>`;
}).join("");
const middleGroup = placedMiddle.map((pl) => {
  const deg = ((pl.theta + Math.PI / 2) * 180) / Math.PI;
  const bx = CX + pl.R * Math.cos(pl.theta);
  const by = CY + pl.R * Math.sin(pl.theta);
  return `<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${deg.toFixed(1)})"><path d="${pl.path}" fill="#e6c95c"/></g>`;
}).join("");
const latinGroup = placedLatin.map(glyphGroup).join("");

const eagleSvg = [
  ...EAGLE.wings.map((w) => `<path d="${polygonPath(w)}" fill="url(#brown)"/>`),
  `<path d="${polygonPath(EAGLE.body)}" fill="url(#brown)"/>`,
  `<circle cx="${EAGLE.head.cx}" cy="${EAGLE.head.cy}" r="${EAGLE.head.r}" fill="#f2efe4"/>`,
  `<path d="${polygonPath(EAGLE.chest)}" fill="#e2ded0"/>`,
  `<path d="${polygonPath(EAGLE.tail)}" fill="#f2efe4"/>`,
  ...EAGLE.talons.map((t) => `<path d="${polygonPath(t)}" fill="#e9b93c"/>`),
  `<path d="${polygonPath(EAGLE.beak)}" fill="#e9b93c"/>`,
  `<circle cx="${EAGLE.eye.cx}" cy="${EAGLE.eye.cy}" r="${EAGLE.eye.r}" fill="#040406"/>`,
].join("");

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5e3a2"/>
      <stop offset="45%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#8f6b22"/>
    </linearGradient>
    <linearGradient id="brown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9a6431"/>
      <stop offset="100%" stop-color="#683f18"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="${(R_OUTER + R_INNER) / 2}" fill="none" stroke="url(#gold)" stroke-width="${R_OUTER - R_INNER}"/>
  <circle cx="256" cy="256" r="${R_FIELD}" fill="#0b0b12"/>
  <circle cx="256" cy="256" r="${R_MID_TOP}" fill="none" stroke="#d4af37" stroke-width="1.7"/>
  <circle cx="256" cy="256" r="${R_MID_BOT}" fill="none" stroke="#d4af37" stroke-width="1.6"/>
  <circle cx="256" cy="256" r="${R_EMBLEM}" fill="none" stroke="#d4af37" stroke-width="2.1"/>
  ${eagleSvg}
  ${middleGroup}
  ${shadowLatinGroup}
  ${latinGroup}
  ${arabicGroup}
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, "favicon.svg"), favicon);
console.log("✔ favicon.svg");

// Sanity histogram (icon-512)
{
  const canvas = render(512, {});
  const hist = {};
  for (let i = 0; i < canvas.length; i += 4) {
    const key = `${canvas[i] >> 5},${canvas[i + 1] >> 5},${canvas[i + 2] >> 5}`;
    hist[key] = (hist[key] ?? 0) + 1;
  }
  const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log("Color histogram (5-bit buckets):", top.map(([k, v]) => `${k}=${v}`).join(" "));
}
console.log("All official badge icons generated.");