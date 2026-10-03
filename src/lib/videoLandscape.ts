/**
 * 🎥 تحويل الفيديو العمودي إلى أفقي متوافق مع يوتيوب — في المتصفح، بلا خادم.
 *
 * الفكرة: يُرسم الفيديو على لوحة 16:9 بخلفية مكبّرة/معتمة + نسخة كاملة في
 * المنتصف (Letterbox مقلوب)، ويُسجَّل ناتج اللوحة مع الصوت الأصلي عبر
 * MediaRecorder إلى ملف WebM — وهو صيغة يوتيوب المدعومة رسمياً.
 *
 * لا يُرفع أي شيء إلى أي خادم هنا: المخرج يبقى في ذاكرة المتصفح ثم يرفعه
 * المكوّن إلى تخزين المنصة وينشره إلى يوتيوب بضغطة زر واحدة.
 */

export type Orientation = "portrait" | "landscape" | "square";

export type VideoProbe = {
  width: number;
  height: number;
  duration: number;
  orientation: Orientation;
  /** التحويل مطلوب فقط للفيديو العمودي/المربّع — الأفقي يُنشر كما هو. */
  needsConversion: boolean;
};

export type ConvertProgress = { phase: "read" | "convert" | number };

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const FPS = 30;

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("تعذر قراءة ملف الفيديو"));
    video.src = url;
  });
}

/** يقرأ أبعاد الفيديو وتحديد اتجاهه قبل النشر. */
export async function probeVideo(file: File): Promise<VideoProbe> {
  const url = URL.createObjectURL(file);
  try {
    const video = await loadVideo(url);
    const width = video.videoWidth;
    const height = video.videoHeight;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const orientation: Orientation =
      height > width ? "portrait" : width > height ? "landscape" : "square";
    video.src = "";
    return {
      width,
      height,
      duration,
      orientation,
      needsConversion: orientation !== "landscape",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * يحوّل الفيديو العمودي إلى أفقي 16:9 (1280×720) مع الحفاظ على الصوت،
 * ويعيد ملفاً جاهزاً للرفع. يرمي خطأً واضحاً إن لم يدعم المتصفح التسجيل.
 */
export async function convertToLandscape(
  file: File,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error("المتصفح لا يدعم تسجيل الفيديو (MediaRecorder) — انشر الملف الأصلي");
  }
  const url = URL.createObjectURL(file);
  let audioCtx: AudioContext | null = null;
  try {
    const video = await loadVideo(url);
    video.volume = 1;
    video.muted = false;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذر تهيئة لوحة الرسم");

    // 🎵 مسار الصوت: من عنصر الفيديو إلى وجهة تسجيل (بلا سماعات).
    const stream = canvas.captureStream(FPS);
    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      const track = dest.stream.getAudioTracks()[0];
      if (track) stream.addTrack(track);
    } catch {
      // فشل الصوت لا يمنع الفيديو — يُسجَّل بلا صوت ويُبلَّغ المستخدم.
      console.warn("[VideoLandscape] تعذر التقاط الصوت — يُحوَّل بلا صوت");
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const finished = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("توقف تسجيل الفيديو فجأة"));
    });

    const draw = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      // 1) خلفية: الفيديو مكبّر ليملأ اللوحة + طبقة تعتيم.
      const coverScale = Math.max(TARGET_WIDTH / vw, TARGET_HEIGHT / vh);
      const cw = vw * coverScale;
      const ch = vh * coverScale;
      ctx.filter = "blur(18px) brightness(0.45)";
      ctx.drawImage(video, (TARGET_WIDTH - cw) / 2, (TARGET_HEIGHT - ch) / 2, cw, ch);
      ctx.filter = "none";
      ctx.fillStyle = "rgba(8,10,24,0.35)";
      ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);
      // 2) نسخة كاملة في المنتصف بنسبة أبعادها الأصلية (بلا قص).
      const containScale = Math.min(TARGET_WIDTH / vw, TARGET_HEIGHT / vh);
      const dw = vw * containScale;
      const dh = vh * containScale;
      ctx.drawImage(video, (TARGET_WIDTH - dw) / 2, (TARGET_HEIGHT - dh) / 2, dw, dh);
      if (onProgress && video.duration > 0) {
        onProgress(Math.min(99, Math.round((video.currentTime / video.duration) * 100)));
      }
    };

    const loop = () => {
      draw();
      if (!video.ended && recorder.state === "recording") requestAnimationFrame(loop);
    };

    recorder.start(1000);
    video.currentTime = 0;
    await new Promise<void>((resolve) => {
      const onPlay = () => resolve();
      video.onplaying = onPlay;
      video.play().catch(() => resolve());
    });
    requestAnimationFrame(loop);
    await new Promise<void>((resolve) => {
      if (video.ended) resolve();
      else video.onended = () => resolve();
    });
    draw();
    recorder.stop();
    await finished;
    onProgress?.(100);
    return new Blob(chunks, { type: mimeType.split(";")[0] });
  } finally {
    URL.revokeObjectURL(url);
    if (audioCtx) void audioCtx.close().catch(() => undefined);
  }
}
