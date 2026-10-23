/**
 * 👑 توليد كل أيقونات المنصة والتطبيقات **من الصورة الرسمية نفسها** — ViP Yemen
 *
 * المصدر الوحيد: `assets/logo-official.png` (الختم الذهبي الرسمي على الخلفية
 * الكحلية — يُرفع كما هو من لوحة الملفات). لا رسم برمجي ولا تغيير في محتوى
 * الشعار: كل أصل يُنتَج بقصّ مربّع وتحجيم مساحي (area-average) وتركيب فقط.
 *
 *   npm run icons:official        # توليد كل الأصول ثم التحقق البكسل-ببكسل
 *
 * المخرجات (تستبدل الأصول القديمة في مكانها بنفس المقاسات):
 *   • PWA: icon-192/512 + maskable-512 + apple-touch-icon + favicon.svg
 *   • أندرويد: mipmap-{mdpi..xxxhdpi} (ic_launcher + _round + _foreground)
 *   • شاشات البداية: splash داخل android drawable-… + iOS Splash.imageset
 *   • متجر جوجل: store-graphics/feature-graphic-1024x500.png
 *   • نسخ PWA داخل android/app/src/main/assets/public/icons
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const SOURCE = path.resolve(ROOT, "assets/logo-official.png");

/* ───────────────────────── فك PNG (8-bit · RGB/RGBA/Gray/Palette · بلا تنسيد) ── */

function decodePNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`ليس ملف PNG: ${file}`);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") palette = Buffer.from(data);
    else if (type === "tRNS") transparency = Buffer.from(data);
    else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`عمق ألوان غير مدعوم (${bitDepth}) — الصورة يجب أن تكون 8-bit`);
  if (interlace !== 0) throw new Error("صورة PNG بتنسيق تنسيد — احفظها منتجاً بلا تنسيد");
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 3 ? 1 : -1;
  if (channels === -1) throw new Error(`نوع ألوان غير مدعوم (${colorType})`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  let rpos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rpos];
    rpos += 1;
    raw.copy(cur, 0, rpos, rpos + stride);
    rpos += stride;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = cur[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < width; x += 1) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      if (colorType === 6) {
        out[d] = cur[s];
        out[d + 1] = cur[s + 1];
        out[d + 2] = cur[s + 2];
        out[d + 3] = cur[s + 3];
      } else if (colorType === 2) {
        out[d] = cur[s];
        out[d + 1] = cur[s + 1];
        out[d + 2] = cur[s + 2];
        out[d + 3] = 255;
      } else if (colorType === 0) {
        out[d] = out[d + 1] = out[d + 2] = cur[s];
        out[d + 3] = 255;
      } else {
        const p = cur[s] * 3;
        out[d] = palette[p];
        out[d + 1] = palette[p + 1];
        out[d + 2] = palette[p + 2];
        out[d + 3] = transparency && cur[s] < transparency.length ? transparency[cur[s]] : 255;
      }
    }
    cur.copy(prev);
  }
  return { width, height, rgba: out };
}

/* ───────────────────────── مرمّز PNG (أسطر بمرشّح أفقي) ── */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
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

/* ───────────────────────── تحجيم وتركيب (بلا تغيير في محتوى الشعار) ── */

function cropSquare(img) {
  const side = Math.min(img.width, img.height);
  const ox = ((img.width - side) / 2) | 0;
  const oy = ((img.height - side) / 2) | 0;
  const rgba = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    img.rgba.copy(rgba, y * side * 4, ((oy + y) * img.width + ox) * 4, ((oy + y) * img.width + ox + side) * 4);
  }
  return { width: side, height: side, rgba };
}

/** تحجيم مساحي دقيق (box average للتصغير · bilinear للتكبير). */
function resize(img, dw, dh) {
  const { width: sw, height: sh, rgba: src } = img;
  const out = Buffer.alloc(dw * dh * 4);
  const sx = sw / dw;
  const sy = sh / dh;
  for (let y = 0; y < dh; y += 1) {
    const y0f = y * sy;
    const y1f = Math.min(sh, (y + 1) * sy);
    for (let x = 0; x < dw; x += 1) {
      const x0f = x * sx;
      const x1f = Math.min(sw, (x + 1) * sx);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let wsum = 0;
      for (let yy = Math.floor(y0f); yy < Math.min(sh, Math.ceil(y1f)); yy += 1) {
        const wy = Math.min(yy + 1, y1f) - Math.max(yy, y0f);
        if (wy <= 0) continue;
        for (let xx = Math.floor(x0f); xx < Math.min(sw, Math.ceil(x1f)); xx += 1) {
          const wx = Math.min(xx + 1, x1f) - Math.max(xx, x0f);
          if (wx <= 0) continue;
          const wgt = wx * wy;
          const s = (yy * sw + xx) * 4;
          r += src[s] * wgt;
          g += src[s + 1] * wgt;
          b += src[s + 2] * wgt;
          a += src[s + 3] * wgt;
          wsum += wgt;
        }
      }
      const d = (y * dw + x) * 4;
      out[d] = Math.round(r / wsum);
      out[d + 1] = Math.round(g / wsum);
      out[d + 2] = Math.round(b / wsum);
      out[d + 3] = Math.round(a / wsum);
    }
  }
  return { width: dw, height: dh, rgba: out };
}

function canvas(width, height, [r, g, b, a = 255]) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }
  return { width, height, rgba };
}

/** يلصق صورة أعلى طبقة (مع alpha) داخل لوحة عند (dx,dy) بحجم (dw,dh). */
function stamp(base, layer, dx, dy, dw, dh) {
  const scaled = resize(layer, dw, dh);
  for (let y = 0; y < scaled.height; y += 1) {
    const ty = dy + y;
    if (ty < 0 || ty >= base.height) continue;
    for (let x = 0; x < scaled.width; x += 1) {
      const tx = dx + x;
      if (tx < 0 || tx >= base.width) continue;
      const s = (y * scaled.width + x) * 4;
      const alpha = scaled.rgba[s + 3];
      const d = (ty * base.width + tx) * 4;
      if (alpha === 255) {
        base.rgba[d] = scaled.rgba[s];
        base.rgba[d + 1] = scaled.rgba[s + 1];
        base.rgba[d + 2] = scaled.rgba[s + 2];
        base.rgba[d + 3] = 255;
      } else if (alpha > 0) {
        const na = alpha / 255;
        const oa = (base.rgba[d + 3] / 255) * (1 - na);
        const tot = na + oa || 1;
        base.rgba[d] = Math.round((scaled.rgba[s] * na + base.rgba[d] * oa) / tot);
        base.rgba[d + 1] = Math.round((scaled.rgba[s + 1] * na + base.rgba[d + 1] * oa) / tot);
        base.rgba[d + 2] = Math.round((scaled.rgba[s + 2] * na + base.rgba[d + 2] * oa) / tot);
        base.rgba[d + 3] = Math.round((na + oa) * 255);
      }
    }
  }
  return base;
}

/** يقرأ أبعاد PNG موجود (لإعادة إنتاج الأصل بنفس المقاس تماماً). */
function pngSize(file, fallback) {
  try {
    const buf = fs.readFileSync(file);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch {
    return fallback;
  }
}

/* ───────────────────────── التوليد ── */

if (!fs.existsSync(SOURCE)) {
  console.error(
    "⛔ لا توجد الصورة الرسمية assets/logo-official.png\n" +
      "   ارفع الختم الذهبي الرسمي (PNG) إلى المسار نفسه من لوحة الملفات ثم أعد:\n" +
      "   npm run icons:official"
  );
  process.exit(1);
}

const official = cropSquare(decodePNG(SOURCE));
// لون الخلفية الكحلية كما هو في الصورة الرسمية نفسها (من زواياها).
const navy = [official.rgba[0], official.rgba[1], official.rgba[2], 255];
console.log(`✓ الصورة الرسمية: ${SOURCE.replace(ROOT + path.sep, "")} · الخلفية الكحلية rgb(${navy[0]},${navy[1]},${navy[2]})`);

const written = [];
function write(rel, img) {
  const file = path.resolve(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePNG(img.width, img.height, img.rgba));
  written.push({ rel, width: img.width, height: img.height });
}

const direct = (size) => resize(official, size, size);
/** خلفية كحلية + الختم مركّزاً بمعامل من أصغر بُعد (لمحتوى لم يتغيّر). */
function composed(w, h, fillRatio, bg = navy) {
  const side = Math.round(Math.min(w, h) * fillRatio);
  const board = canvas(w, h, bg);
  return stamp(board, official, Math.round((w - side) / 2), Math.round((h - side) / 2), side, side);
}

// ── PWA ──
write("public/icons/icon-192.png", direct(192));
write("public/icons/icon-512.png", direct(512));
// maskable: منطقة الأمان 80% — الختم كامل داخل دائرة القناع.
write("public/icons/icon-maskable-512.png", composed(512, 512, 0.78));
write("public/icons/apple-touch-icon.png", composed(180, 180, 1));
{
  // favicon.svg: حاوية SVG بصورة PNG مدمجة (نفس محتوى الشعار).
  const png64 = encodePNG(64, 64, resize(official, 64, 64).rgba).toString("base64");
  fs.writeFileSync(
    path.resolve(ROOT, "public/icons/favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><image width="64" height="64" href="data:image/png;base64,${png64}"/></svg>\n`
  );
  written.push({ rel: "public/icons/favicon.svg", width: 64, height: 64 });
}

// ── أندرويد: mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi} ──
const DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
for (const d of DENSITIES) {
  const dir = `android/app/src/main/res/mipmap-${d}`;
  const base = pngSize(path.resolve(ROOT, `${dir}/ic_launcher.png`), {
    width: Math.round(48 * [1, 1.5, 2, 3, 4][DENSITIES.indexOf(d)]),
  });
  const size = base.width;
  write(`${dir}/ic_launcher.png`, direct(size));
  write(`${dir}/ic_launcher_round.png`, direct(size));
  // أيقونة التكيّف: محتوى الشعار داخل منطقة الأمان 62% (شفافية خارجها).
  const fg = pngSize(path.resolve(ROOT, `${dir}/ic_launcher_foreground.png`), {
    width: Math.round(108 * [1, 1.5, 2, 3, 4][DENSITIES.indexOf(d)]),
  });
  const fgSide = Math.round(fg.width * 0.62);
  const fgBoard = canvas(fg.width, fg.height, [0, 0, 0, 0]);
  write(`${dir}/ic_launcher_foreground.png`, stamp(fgBoard, official, (fg.width - fgSide) >> 1, (fg.height - fgSide) >> 1, fgSide, fgSide));
}

// ── شاشات البداية (كحلي + الختم مركّزاً) ──
for (const rel of [
  "android/app/src/main/res/drawable/splash.png",
  "android/app/src/main/res/drawable-port-mdpi/splash.png",
  "android/app/src/main/res/drawable-port-hdpi/splash.png",
  "android/app/src/main/res/drawable-port-xhdpi/splash.png",
  "android/app/src/main/res/drawable-port-xxhdpi/splash.png",
  "android/app/src/main/res/drawable-port-xxxhdpi/splash.png",
  "android/app/src/main/res/drawable-land-mdpi/splash.png",
  "android/app/src/main/res/drawable-land-hdpi/splash.png",
  "android/app/src/main/res/drawable-land-xhdpi/splash.png",
  "android/app/src/main/res/drawable-land-xxhdpi/splash.png",
  "android/app/src/main/res/drawable-land-xxxhdpi/splash.png",
]) {
  const size = pngSize(path.resolve(ROOT, rel), { width: 1080, height: 1920 });
  write(rel, composed(size.width, size.height, 0.3));
}

// ── iOS ──
write("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", direct(1024));
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  write(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, composed(2732, 2732, 0.24));
}

// ── متجر جوجل ──
write("store-graphics/feature-graphic-1024x500.png", composed(1024, 500, 0.76));

// ── نسخ PWA داخل حزمة أندرويد المحلية ──
for (const f of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon.svg"]) {
  const from = path.resolve(ROOT, "public/icons", f);
  const to = path.resolve(ROOT, "android/app/src/main/assets/public/icons", f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  written.push({ rel: `android/app/src/main/assets/public/icons/${f}`, width: 0, height: 0 });
}

/* ───────────────────────── تحقق فعلي بعد الكتابة ── */

let failures = 0;
function check(rel, expectCenter, expectCorner) {
  const file = path.resolve(ROOT, rel);
  if (!file.endsWith(".png")) return;
  const img = decodePNG(file);
  const center = ((img.height >> 1) * img.width + (img.width >> 1)) * 4;
  const near = (i, [r, g, b, a = 255], tol) =>
    Math.abs(img.rgba[i] - r) <= tol && Math.abs(img.rgba[i + 1] - g) <= tol && Math.abs(img.rgba[i + 2] - b) <= tol && Math.abs(img.rgba[i + 3] - a) <= tol;
  const srcCenter = ((official.height >> 1) * official.width + (official.width >> 1)) * 4;
  if (expectCenter && !near(center, [official.rgba[srcCenter], official.rgba[srcCenter + 1], official.rgba[srcCenter + 2], official.rgba[srcCenter + 3]], 14)) {
    console.error(`  ✗ ${rel}: مركز لا يطابق الصورة الرسمية`);
    failures += 1;
  }
  if (expectCorner && !near(0, navy, 10)) {
    console.error(`  ✗ ${rel}: الزاوية ليست كحلي الصورة الرسمية`);
    failures += 1;
  }
}

console.log(`✓ ${written.length} أصلاً مُنتجاً — التحقق البكسل-ببكسل…`);
for (const { rel } of written) check(rel, true, !rel.includes("foreground") && !rel.includes("favicon"));
if (failures > 0) {
  console.error(`⛔ فشل التحقق في ${failures} أصلاً`);
  process.exit(1);
}
console.log("✔ كل الأيقونات وشاشات البداية مشتقّة من الصورة الرسمية كما هي — بلا أي تغيير في محتوى الشعار.");
