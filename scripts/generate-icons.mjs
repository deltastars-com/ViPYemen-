// Generates PWA/app icons as PNGs with zero dependencies (Node zlib + hand-rolled PNG encoder).
// Design: navy rounded square, gold "V / eagle" mark — matches the in-app LogoMark.
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve("public/icons");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------- PNG encoder ----------
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
    raw[y * stride] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * stride + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- Geometry (48x48 design space) ----------
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

const V_POLY = [
  [9, 32], [19, 13], [24, 24], [29, 13], [39, 32], [31, 32], [27, 23], [24, 30], [21, 23], [17, 32],
];
const GOLD_TOP = [240, 217, 140];
const GOLD_MID = [212, 175, 55];
const GOLD_BOTTOM = [168, 134, 42];
const NAVY = [10, 14, 26];

function scalePoly(poly, s, cx, cy) {
  return poly.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);
}

function colorAt(x, y, { maskable, radius, border }) {
  // Background rounded rect
  const r = radius;
  const dx = Math.max(Math.abs(x - 24) - (24 - r), 0);
  const dy = Math.max(Math.abs(y - 24) - (24 - r), 0);
  const insideBg = Math.sqrt(dx * dx + dy * dy) <= r;
  if (!insideBg) return [0, 0, 0, 0];
  if (!maskable) {
    // gold border stroke
    const distEdge = r - Math.sqrt(dx * dx + dy * dy);
    if (distEdge < border && distEdge > -border * 0.4) return [...GOLD_MID, 255];
  }
  let color = [...NAVY, 255];
  const circle = Math.hypot(x - 24, y - 10) <= 2.4;
  if (circle) return [...GOLD_MID, 255];
  if (pointInPoly(x, y, V_POLY)) {
    const t = Math.min(Math.max((y - 10) / 26, 0), 1);
    color = [...lerpColor(GOLD_TOP, GOLD_BOTTOM, t), 255];
  }
  return color;
}

function render(size, { maskable = false, radius = 12, border = 1.6 } = {}) {
  const SS = 4; // supersampling
  const canvas = new Uint8Array(size * size * 4);
  const polys = {
    v: scalePoly(V_POLY, maskable ? 0.66 : 1, 24, 24),
    circle: maskable ? [24, 24 + (10 - 24) * 0.66, 2.4 * 0.66] : [24, 10, 2.4],
  };
  const scale = size / 48;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / scale;
          const y = (py + (sy + 0.5) / SS) / scale;
          const c = colorAtShape(x, y, polys, maskable, radius, border);
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

function colorAtShape(x, y, polys, maskable, radius, border) {
  const r = radius;
  const dx = Math.max(Math.abs(x - 24) - (24 - r), 0);
  const dy = Math.max(Math.abs(y - 24) - (24 - r), 0);
  if (Math.sqrt(dx * dx + dy * dy) > r) return [0, 0, 0, 0];
  if (!maskable) {
    const distEdge = r - Math.sqrt(dx * dx + dy * dy);
    if (distEdge < border && distEdge > -border * 0.4) return [...GOLD_MID, 255];
  }
  const [cx, cy, cr] = polys.circle;
  if (Math.hypot(x - cx, y - cy) <= cr) return [...GOLD_MID, 255];
  if (pointInPoly(x, y, polys.v)) {
    const t = Math.min(Math.max((y - 11) / 24, 0), 1);
    return [...lerpColor(GOLD_TOP, GOLD_BOTTOM, t), 255];
  }
  return [...NAVY, 255];
}

function writeIcon(file, size, opts) {
  const canvas = render(size, opts);
  const png = encodePNG(size, size, canvas);
  fs.writeFileSync(path.join(OUT_DIR, file), png);
  console.log(`✔ ${file} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

writeIcon("icon-192.png", 192, {});
writeIcon("icon-512.png", 512, {});
writeIcon("icon-maskable-512.png", 512, { maskable: true, radius: 0, border: 0 });
writeIcon("apple-touch-icon.png", 180, { maskable: true, radius: 0, border: 0 });

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0d98c"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#a8862a"/>
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="45" height="45" rx="12" fill="#0a0e1a" stroke="url(#g)" stroke-width="2"/>
  <path d="M9 32 L19 13 L24 24 L29 13 L39 32 L31 32 L27 23 L24 30 L21 23 L17 32 Z" fill="url(#g)"/>
  <circle cx="24" cy="10" r="2.4" fill="#d4af37"/>
</svg>`;
fs.writeFileSync(path.join(OUT_DIR, "favicon.svg"), favicon);
console.log("✔ favicon.svg");
console.log("All icons generated in public/icons/");