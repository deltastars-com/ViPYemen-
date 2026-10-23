/**
 * 🗜️ ضغط الصور قبل الرفع — حماية حصة التخزين المجانية.
 *
 * حدود الخطة المجانية في Convex: 1GB ملفات + 1GB نقل/شهر
 * (docs.convex.dev/production/state/limits). صورة هاتف نموذجية 4–8MB
 * تُضغط إلى 150–400KB (WebP · 800px · جودة 0.7) — أي **تخفيض 90%+**
 * في كل من التخزين والنقل، بجودة كافية تماماً لعرض إعلان مصنّف.
 *
 * الاستراتيجية:
 *   · الصور فقط (لا فيديو/صوت/مستندات).
 *   · GIF محفوظة كما هي (الضغط يقتل حركتها).
 *   · createImageBitmap مع احترام اتجاه EXIF، ورسم «contain» داخل
 *     أقصى أبعاد 800px بلا قصّ (تفقد التفاصيل الجانبية).
 *   · أي فشل في فك/ضغط الترميز → نُعيد الملف الأصلي كما هو
 *     (الوظيفة أولاً: الرفع لا يتعطل أبداً بسبب الضغط).
 */

export const MAX_IMAGE_DIMENSION = 800;
export const IMAGE_QUALITY = 0.7;

export interface CompressedImage {
  blob: Blob;
  name: string;
  /** الحجم قبل الضغط بالبايت */
  originalSize: number;
  /** الحجم بعد الضغط (أو الأصلي إن تخطّي الضغط) */
  finalSize: number;
  /** سبب تخطّي الضغط إن وُجد (صيغة غير قابلة للضغط) */
  skipped?: string;
}

function webpSupported(): boolean {
  try {
    return document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    return false;
  }
}

function renameToWebp(name: string): string {
  return name.replace(/\.[a-zA-Z0-9]+$/, "") + ".webp";
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const passthrough = (skipped: string): CompressedImage => ({
    blob: file,
    name: file.name,
    originalSize: file.size,
    finalSize: file.size,
    skipped,
  });

  if (!file.type.startsWith("image/")) return passthrough("ليس ملفاً بصرياً");
  if (file.type === "image/gif") return passthrough("GIF — تُرفع كما هي للحفاظ على حركتها");
  if (file.type === "image/svg+xml") return passthrough("SVG — رسم متجهي يُرفع كما هو");
  if (typeof createImageBitmap !== "function") return passthrough("الجهاز لا يدعم فك الصور في الخلفية");
  if (!webpSupported()) return passthrough("المتصفح لا يدعم WebP — يُرفع الأصلي");

  try {
    let bitmap: ImageBitmap;
    try {
      // احترام اتجاه التصوير (EXIF) حيث يُدعم المتصفح
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return passthrough("تعذّر الوصول إلى لوحة الرسم");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY)
    );
    if (!blob) return passthrough("تعذّر ترميز WebP");

    // لا نستبدل أصلاً أصغر مما أنتجناه (نزد على المخزن لا نوفّر)
    if (blob.size >= file.size) return passthrough("الضغط لم يوفّر شيئاً — يُرفع الأصلي");

    return {
      blob,
      name: renameToWebp(file.name),
      originalSize: file.size,
      finalSize: blob.size,
    };
  } catch {
    return passthrough("تعذّر معالجة الصورة — يُرفع الأصلي");
  }
}
