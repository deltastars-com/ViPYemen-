// =============================================================================
// ViP Yemen — أيقونات بلا خسارة: تحقّق أن الضغط لم يغيّر أي بكسل
// -----------------------------------------------------------------------------
// يفكّ أي ملف PNG بسيط (8-bit، RGB أو RGBA، مرشّحات 0–4) ويقارن البكسلات
// بمرجع. يُستخدم بعد `npm run icons` للتأكد من أن الهوية البصرية مطابقة
// حرفياً وأن التوفير في الحجم بلا فقدان.
//
//   node scripts/verify-icons.mjs <reference-dir> <dir> [files...]
// =============================================================================
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8;
  let width = 0, height = 0, colorType = 6;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error("only 8-bit PNG supported");
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    pos += 12 + len;
  }
  const bpp = colorType === 2 ? 3 : colorType === 6 ? 4 : -1;
  if (bpp < 0) throw new Error(`unsupported color type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rowBytes = width * bpp;
  const stride = rowBytes + 1;
  const out = Buffer.alloc(width * height * 4); // always RGBA out
  const prev = Buffer.alloc(rowBytes);
  const cur = Buffer.alloc(rowBytes);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    for (let x = 0; x < rowBytes; x++) {
      const rawByte = raw[y * stride + 1 + x];
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let pred = 0;
      if (filter === 1) pred = a;
      else if (filter === 2) pred = b;
      else if (filter === 3) pred = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = (rawByte + pred) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const s = x * bpp;
      out[o] = cur[s];
      out[o + 1] = cur[s + 1];
      out[o + 2] = cur[s + 2];
      out[o + 3] = bpp === 4 ? cur[s + 3] : 255;
    }
    cur.copy(prev);
  }
  return { width, height, rgba: out };
}

const [refDir, newDir, ...files] = process.argv.slice(2);
if (!refDir || !newDir) {
  console.error("usage: node scripts/verify-icons.mjs <reference-dir> <dir> [files...]");
  process.exit(2);
}
const list = files.length
  ? files
  : fs.readdirSync(newDir).filter((f) => f.endsWith(".png"));

let failures = 0;
for (const file of list) {
  const refPath = path.join(refDir, file);
  const newPath = path.join(newDir, file);
  if (!fs.existsSync(refPath) || !fs.existsSync(newPath)) {
    console.log(`⚠️ ${file}: missing on one side — skipped`);
    continue;
  }
  const a = decodePNG(fs.readFileSync(refPath));
  const b = decodePNG(fs.readFileSync(newPath));
  const samePixels =
    a.width === b.width &&
    a.height === b.height &&
    a.rgba.length === b.rgba.length &&
    a.rgba.equals(b.rgba);
  const before = fs.statSync(refPath).size;
  const after = fs.statSync(newPath).size;
  const save = (100 * (1 - after / before)).toFixed(1);
  if (!samePixels) {
    failures++;
    console.log(`❌ ${file}: PIXELS DIFFER (${a.width}x${a.height} vs ${b.width}x${b.height})`);
  } else {
    console.log(
      `✅ ${file}: ${a.width}x${a.height} identical pixels · ${(before / 1024).toFixed(1)} KB → ${(after / 1024).toFixed(1)} KB (−${save}%)`
    );
  }
}
if (failures) {
  console.error(`\n${failures} ملف/ملفات تغيّرت بكسلاتها — إيقاف.`);
  process.exit(1);
}
console.log("\nكل الملفات مطابقة بكسلاً ببكسل ✅");
