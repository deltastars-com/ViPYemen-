// =============================================================================
// ViP Yemen — Official app icon generator (zero native deps)
// -----------------------------------------------------------------------------
// Matches the official badge 1:1:
//   • metallic gold ring with dark engraved "VIPSERVICESYEMEN" arc (top, wide tracking)
//   • black field with dot texture + two black crescent accents (upper sides)
//   • middle tagline ring "For Employment, E-Marketing & General Services"
//     with upright "★ ( ViP ) ★" at the bottom
//   • bright gold ribbon banner across the bottom carrying the black Arabic
//     tagline "للتوفيق والثقة الإلكتروني والخدمات العامة"
//   • brown eagle emblem with white head/chest/tail and gold beak/talons
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
  return infos.map((info, i) => ({
    gid: info.codepoint,
    xAdvance: positions[i].xAdvance,
    yAdvance: positions[i].yAdvance,
    xOffset: positions[i].xOffset,
    yOffset: positions[i].yOffset,
  }));
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
const DEG = Math.PI / 180;

// ---------------- Badge layout (512 design space, center 256,256) ----------------
const CX = 256, CY = 256;
const R_OUTER = 250, R_INNER = 224;      // gold ring band
const R_FIELD = 221;                     // black field
const R_TEXT_LATIN = 227;                // Latin baseline ON the band (caps reach ~248)
const RIBBON_A1 = 42 * DEG, RIBBON_A2 = 138 * DEG; // ribbon angular span (bottom)
const RIBBON_OUTER = 251;
// Ribbon inner edge: arc of the circle centered (256,236) r=216 -> d(a) closed form
const RIB_C2_DY = 20, RIB_R2 = 216;
function ribbonInnerD(a) {
  const s = Math.sin(a);
  return -RIB_C2_DY * s + Math.sqrt(RIB_C2_DY * RIB_C2_DY * s * s + RIB_R2 * RIB_R2 - RIB_C2_DY * RIB_C2_DY + 400 + 46256 - 46256 + 0) // keep simple below
}
// (clean implementation)
function ribbonInner(a) {
  const s = Math.sin(a);
  // |P - C2|^2 = R2^2 with P = C + d*u, C-C2 = (0, +20):
  // d^2 + 2*d*(20*sin a) + 400 - R2^2 = 0
  const b = 2 * 20 * s;
  const c = 400 - RIB_R2 * RIB_R2;
  return (-b + Math.sqrt(b * b - 4 * c)) / 2;
}
const R_TEXT_ARABIC = 233;               // Arabic baseline on the ribbon (tops point inward)
const R_MID_TOP = 191, R_MID_BOT = 145;  // middle thin rings
const R_MID_TEXT = 168;                  // tagline + ( ViP ) radius
const R_EMBLEM = 136;                    // emblem thin ring

const GOLD_LIGHT = [245, 227, 162];
const GOLD_MID = [212, 175, 55];
const GOLD_DARK = [143, 107, 34];
const LATIN_DARK = [62, 44, 11];         // engraved dark bronze (official)
const RIBBON_TOP = [252, 224, 108];      // bright banner gold
const RIBBON_BOT = [216, 166, 44];
const FIELD = [11, 11, 18];
const DOT = [32, 39, 56];
const CRESCENT = [5, 5, 9];
const BROWN_TOP = [154, 100, 49];
const BROWN_BOT = [104, 63, 24];
const WHITE_FEATHER = [242, 239, 228];
const GOLD_ACCENT = [233, 185, 60];
const TAG_GOLD = [226, 196, 92];
const VIP_GOLD = [240, 214, 120];
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
  return {
    wings: EAGLE_RAW.wings.map((w) => w.map(sp)),
    body: EAGLE_RAW.body.map(sp),
    head: { cx: CX + (EAGLE_RAW.head.cx - CX) * es, cy: CY + (EAGLE_RAW.head.cy - CY) * es, r: EAGLE_RAW.head.r * es },
    chest: EAGLE_RAW.chest.map(sp),
    beak: EAGLE_RAW.beak.map(sp),
    eye: { cx: CX + (EAGLE_RAW.eye.cx - CX) * es, cy: CY + (EAGLE_RAW.eye.cy - CY) * es, r: EAGLE_RAW.eye.r * es },
    tail: EAGLE_RAW.tail.map(sp),
    talons: EAGLE_RAW.talons.map((t) => t.map(sp)),
  };
}
const EAGLE = scaleEagle(0.78);

// ---------------- Text runs ----------------
const TEXT_LATIN = "VIPSERVICESYEMEN";
const TEXT_ARABIC = "للتوفيق والثقة الإلكتروني والخدمات العامة";
const TEXT_TAGLINE = "For Employment, E-Marketing & General Services";
const TEXT_VIP = "* ( ViP ) *";

function latinRun(text, sizePx) {
  const chars = [...text];
  const scale = sizePx / UPEM;
  return chars.map((ch) => {
    const gid = latinFont.charToGlyphIndex(ch);
    const adv = latinFont.glyphs.get(gid).advanceWidth * scale;
    return { gid, adv, contours: outlinesFor(latinFont, gid, sizePx), path: pathDataFor(latinFont, gid, sizePx) };
  });
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

function totalAdvance(run) {
  return run.reduce((s, g) => s + g.adv, 0);
}

// --- Top Latin: size 32, wide-tracked to span ~223° like the official badge
let runLatin = latinRun(TEXT_LATIN, 32);
{
  const target = 223 * DEG;
  let angle = totalAdvance(runLatin) / R_TEXT_LATIN;
  if (angle > target) {
    const size = Math.max(24, 32 * (target / angle));
    runLatin = latinRun(TEXT_LATIN, size);
    angle = totalAdvance(runLatin) / R_TEXT_LATIN;
  }
  const extra = (target * R_TEXT_LATIN - totalAdvance(runLatin)) / (runLatin.length - 1);
  if (extra > 0) for (const g of runLatin) g.adv += extra;
}

// --- Ribbon Arabic: fit to fill ~82° of the ribbon
let runArabic = arabicRun(TEXT_ARABIC, 27);
{
  const target = 82 * DEG;
  const angle = totalAdvance(runArabic) / R_TEXT_ARABIC;
  const size = Math.min(30, Math.max(19, 27 * (target / angle)));
  if (Math.abs(size - 27) > 0.4) runArabic = arabicRun(TEXT_ARABIC, size);
}

// --- Middle tagline: fit to span ~238° (stops above the ribbon)
let runTag = latinRun(TEXT_TAGLINE, 19.5);
{
  const target = 238 * DEG;
  const angle = totalAdvance(runTag) / R_MID_TEXT;
  const size = Math.min(27, Math.max(14, 19.5 * (target / angle)));
  runTag = latinRun(TEXT_TAGLINE, size);
}

// --- ( ViP ) upright at the bottom of the middle ring
const runVip = latinRun(TEXT_VIP, 24);

// Glyph placement along an arc.
// outward (default): tops point away from center, theta increases (top text)
// inward:  tops point toward center, theta decreases (bottom text, upright)
function placeRun(run, R, theta0, inward = false) {
  let theta = theta0;
  const placed = [];
  for (const g of run) {
    placed.push({ ...g, theta });
    theta += (inward ? -1 : 1) * (g.adv / R);
  }
  return placed;
}

function bakeRun(placed, R, inward = false) {
  for (const pl of placed) {
    pl.R = R;
    const alpha = inward ? pl.theta - Math.PI / 2 : pl.theta + Math.PI / 2;
    const ca = Math.cos(alpha);
    const sa = Math.sin(alpha);
    const bx = CX + R * Math.cos(pl.theta);
    const by = CY + R * Math.sin(pl.theta);
    const ox = pl.xOff ?? 0;
    const oy = pl.yOff ?? 0;
    pl.alpha = alpha;
    pl.bx = bx;
    pl.by = by;
    pl.baked = pl.contours.map((contour) =>
      contour.map(([px, py]) => {
        const lx = px + ox;
        const ly = py + oy;
        return [lx * ca - ly * sa + bx, lx * sa + ly * ca + by];
      })
    );
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const c of pl.baked) for (const [x, y] of c) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    pl.bbox = [minX, minY, maxX, maxY];
  }
  return placed;
}

// Top Latin: centered on the top (270°)
const placedLatin = bakeRun(
  placeRun(runLatin, R_TEXT_LATIN, (3 * Math.PI) / 2 - (totalAdvance(runLatin) / R_TEXT_LATIN) / 2),
  R_TEXT_LATIN
);
// Ribbon Arabic: centered at the bottom (90°), upright (tops inward)
const placedArabic = bakeRun(
  placeRun(runArabic, R_TEXT_ARABIC, Math.PI / 2 + (totalAdvance(runArabic) / R_TEXT_ARABIC) / 2, true),
  R_TEXT_ARABIC,
  true
);
// Tagline: starts lower-left (151°), wraps clockwise over the top
const TAG_SPAN = 238 * DEG;
const placedTag = bakeRun(
  placeRun(runTag, R_MID_TEXT, (3 * Math.PI) / 2 - TAG_SPAN / 2),
  R_MID_TEXT
);
// ( ViP ): centered at the bottom, upright
const placedVip = bakeRun(
  placeRun(runVip, R_MID_TEXT, Math.PI / 2 + (totalAdvance(runVip) / R_MID_TEXT) / 2, true),
  R_MID_TEXT,
  true
);

// ---------------- Crescent accents (upper sides, hugging the ring's inner edge) ----------------
function crescentPoly(a1, a2) {
  const pts = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const a = lerp(a1, a2, i / N);
    pts.push([CX + 219.5 * Math.cos(a), CY + 219.5 * Math.sin(a)]);
  }
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    const a = lerp(a1, a2, t);
    const d = 219.5 - 20 * Math.sin(Math.PI * t);
    pts.push([CX + d * Math.cos(a), CY + d * Math.sin(a)]);
  }
  return pts;
}
const CRESCENT_L = crescentPoly(205 * DEG, 245 * DEG);
const CRESCENT_R = crescentPoly(295 * DEG, 335 * DEG);

// ---------------- Per-pixel coloring ----------------
function goldRingColor(x, y) {
  const d = Math.hypot(x - CX, y - CY);
  const a = Math.atan2(y - CY, x - CX);
  const f = clamp01((Math.cos(a - -(3 * Math.PI) / 4) + 1) / 2);
  let c = lerpColor(GOLD_DARK, GOLD_LIGHT, 0.35 + 0.65 * f);
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

function colorAt(x, y, maskable) {
  // Maskable: full-bleed navy behind a scaled badge (safe zone)
  const s = maskable ? 0.78 : 1;
  const d0 = Math.hypot(x - CX, y - CY);
  if (maskable && d0 > R_OUTER * s) return [13, 17, 30, 255];
  const mx = CX + (x - CX) / s;
  const my = CY + (y - CY) / s;

  const d = Math.hypot(mx - CX, my - CY);
  const a = Math.atan2(my - CY, mx - CX);

  // 1) Bottom gold ribbon banner (overrides ring + field)
  if (d <= RIBBON_OUTER && a >= RIBBON_A1 && a <= RIBBON_A2 && d >= ribbonInner(a)) {
    if (hitGlyphs(mx, my, placedArabic)) return [23, 18, 7, 255];
    const t = clamp01((d - 196) / 55);
    return [...lerpColor(RIBBON_TOP, RIBBON_BOT, t), 255];
  }

  // 2) Dark engraved Latin on the gold band
  if (hitGlyphs(mx, my, placedLatin)) return [...LATIN_DARK, 255];

  // 3) Gold ring band
  if (d <= R_OUTER && d >= R_INNER) {
    return [...goldRingColor(mx, my), 255];
  }

  // 4) Black field
  if (d <= R_INNER) {
    // black crescent accents
    if (pointInPoly(mx, my, CRESCENT_L) || pointInPoly(mx, my, CRESCENT_R)) return [...CRESCENT, 255];

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

    // middle tagline + upright ( ViP )
    if (hitGlyphs(mx, my, placedTag)) return [...TAG_GOLD, 255];
    if (hitGlyphs(mx, my, placedVip)) return [...VIP_GOLD, 255];

    // subtle dot texture
    const gx = Math.floor(mx / 15) * 15;
    const gy = Math.floor(my / 15) * 15;
    if (Math.hypot(mx - gx, my - gy) < 1.35 && d < R_FIELD - 2) return [...DOT, 255];

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
function glyphGroup(pl, fill) {
  const deg = ((pl.alpha ?? pl.theta + Math.PI / 2) * 180) / Math.PI;
  const bx = pl.bx ?? CX + pl.R * Math.cos(pl.theta);
  const by = pl.by ?? CY + pl.R * Math.sin(pl.theta);
  const ox = pl.xOff ?? 0, oy = pl.yOff ?? 0;
  return `<g transform="translate(${(bx + ox).toFixed(1)} ${(by + oy).toFixed(1)}) rotate(${deg.toFixed(1)})"><path d="${pl.path}" fill="${fill}"/></g>`;
}
// ribbon path: outer arc + inner arc (closed form)
const ribPts = [];
for (let i = 0; i <= 60; i++) {
  const a = lerp(RIBBON_A1, RIBBON_A2, i / 60);
  ribPts.push([CX + RIBBON_OUTER * Math.cos(a), CY + RIBBON_OUTER * Math.sin(a)]);
}
for (let i = 60; i >= 0; i--) {
  const a = lerp(RIBBON_A1, RIBBON_A2, i / 60);
  const di = ribbonInner(a);
  ribPts.push([CX + di * Math.cos(a), CY + di * Math.sin(a)]);
}
const ribbonPath = polygonPath(ribPts);

const svgLatin = placedLatin.map((pl) => glyphGroup(pl, "#3e2c0b")).join("");
const svgArabic = placedArabic.map((pl) => glyphGroup(pl, "#171207")).join("");
const svgTag = placedTag.map((pl) => glyphGroup(pl, "#e2c45c")).join("");
const svgVip = placedVip.map((pl) => glyphGroup(pl, "#f0d678")).join("");

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
    <linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fce06c"/>
      <stop offset="100%" stop-color="#d8a62c"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="${(R_OUTER + R_INNER) / 2}" fill="none" stroke="url(#gold)" stroke-width="${R_OUTER - R_INNER}"/>
  <circle cx="256" cy="256" r="${R_FIELD}" fill="#0b0b12"/>
  <path d="${ribbonPath}" fill="url(#ribbon)"/>
  <path d="${polygonPath(CRESCENT_L)}" fill="#050509"/>
  <path d="${polygonPath(CRESCENT_R)}" fill="#050509"/>
  <circle cx="256" cy="256" r="${R_MID_TOP}" fill="none" stroke="#d4af37" stroke-width="1.7"/>
  <circle cx="256" cy="256" r="${R_MID_BOT}" fill="none" stroke="#d4af37" stroke-width="1.6"/>
  <circle cx="256" cy="256" r="${R_EMBLEM}" fill="none" stroke="#d4af37" stroke-width="2.1"/>
  ${eagleSvg}
  ${svgTag}
  ${svgVip}
  ${svgLatin}
  ${svgArabic}
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

  // pixel probes for the new elements
  let darkLatin = 0, ribbonPx = 0, arabicPx = 0, crescentPx = 0;
  for (let i = 0; i < canvas.length; i += 4) {
    const r = canvas[i], g = canvas[i + 1], b = canvas[i + 2];
    if (r > 40 && r < 90 && g > 28 && g < 70 && b < 40) darkLatin++;
    if (r > 200 && g > 150 && b < 140) ribbonPx++;
    if (r < 45 && g < 40 && b < 30) {
      const px = ((i / 4) % 512) | 0, py = (i / 4 / 512) | 0;
      const dd = Math.hypot(px - 256, py - 256);
      const aa = Math.atan2(py - 256, px - 256);
      if (dd > 205 && dd < 248 && aa > 0.8 && aa < 2.3) arabicPx++;
      if (dd > 200 && dd < 220 && ((aa > 3.55 && aa < 4.3) || (aa < -2.0 && aa > -2.75))) crescentPx++;
    }
  }
  console.log(`Probes: engravedLatin=${darkLatin} ribbonGold=${ribbonPx} ribbonArabic=${arabicPx} crescents=${crescentPx}`);
}
console.log("All official badge icons generated.");
