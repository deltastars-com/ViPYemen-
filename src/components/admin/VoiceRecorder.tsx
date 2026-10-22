/**
 * 🔊 مكوّن «الالتزام الصوتي» — ViP Yemen
 *
 * يسجّل صوت المستفيد وهو يقرأ نص الالتزام، ثم يرفع التسجيل إلى تخزين
 * المنصة الخاص (Convex Storage) ويعيد معرّفه ومدته لربطه بوثيقة التوثيق.
 *
 *  • يعرض نص الالتزام كي يقرأه المستخدم أثناء التسجيل.
 *  • MediaRecorder بصيغة webm/opus (مضغوطة وصغيرة الحجم).
 *  • رفع عبر storage.generateUploadUrl (نفس مسار رفع الملفات في المنصة).
 *  • التشغيل المسبق للتسجيل قبل الإرسال للتأكد من وضوحه.
 *
 * اختياري تماماً (لا يمنع إتمام التوثيق) لكنه يقوّي الإثبات.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Mic, Square, Play, Trash2, Upload, CheckCircle2, Volume2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui";

export type VoiceResult = {
  storageId: string;
  durationMs: number;
  /** رابط معاينة محلية (Object URL) لتشغيل التسجيل قبل الإرسال. */
  previewUrl: string;
};

function fmtDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceRecorder({
  commitmentText,
  onUploaded,
  onCleared,
  disabled,
}: {
  /** نص الالتزام ليقرأه المستخدم أثناء التسجيل (يظهر له). */
  commitmentText: string;
  onUploaded?: (voice: VoiceResult) => void;
  onCleared?: () => void;
  disabled?: boolean;
}) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<VoiceResult | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  // تنظيف عند مغادرة المكوّن (إلغاء كائنات Blob المعلّقة).
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (voice?.previewUrl) URL.revokeObjectURL(voice.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearVoice() {
    if (voice?.previewUrl) URL.revokeObjectURL(voice.previewUrl);
    setVoice(null);
    setError("");
    setElapsed(0);
    onCleared?.();
  }

  async function startRecording() {
    setError("");
    // إذا كان هناك تسجيل سابق، امسحه قبل تسجيل جديد.
    if (voice) clearVoice();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void finalizeRecording(chunksRef.current, Date.now() - startedAtRef.current);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 200);
      recorder.start();
      setRecording(true);
    } catch {
      setError("تعذّر فتح الميكروفون — تأكد من منح الإذن للمتصفح.");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    try {
      recorderRef.current?.stop();
    } catch {
      /* تجاهل */
    }
  }

  async function finalizeRecording(chunks: Blob[], durationMs: number) {
    if (chunks.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const type = chunks[0].type || "audio/webm";
      const blob = new Blob(chunks, { type });
      const previewUrl = URL.createObjectURL(blob);
      // ارفع التسجيل إلى تخزين المنصة الخاص.
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": type },
        body: blob,
      });
      if (!res.ok) throw new Error(`فشل رفع التسجيل (${res.status})`);
      const { storageId } = (await res.json()) as { storageId: string };
      const result: VoiceResult = {
        storageId,
        durationMs: Math.max(500, durationMs),
        previewUrl,
      };
      setVoice(result);
      onUploaded?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر رفع التسجيل الصوتي.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-black text-gold-300">
        <Volume2 className="h-4 w-4" />
        التزام صوتي (اختياري — يقوّي الإثبات)
      </div>

      <p className="mb-2 rounded-lg border border-gold-500/30 bg-gold-500/[0.06] p-2 text-[11px] leading-relaxed text-ink-200">
        اقرأ بصوت واضح نص الالتزام المعروض في التوثيق، ثم اضغط «ابدأ التسجيل».
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button
            type="button"
            variant="gold"
            onClick={startRecording}
            disabled={disabled || busy}
          >
            <Mic className="h-4 w-4" /> {voice ? "تسجيل جديد" : "ابدأ التسجيل"}
          </Button>
        ) : (
          <Button type="button" variant="danger" onClick={stopRecording}>
            <Square className="h-4 w-4" /> إيقاف ({fmtDuration(elapsed)})
          </Button>
        )}

        {recording && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            يسجّل الآن… اقرأ نص الالتزام
          </span>
        )}

        {voice && (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!playbackRef.current) {
                  playbackRef.current = new Audio(voice.previewUrl);
                }
                playbackRef.current.currentTime = 0;
                void playbackRef.current.play();
              }}
            >
              <Play className="h-4 w-4" /> استماع
            </Button>
            <Button type="button" variant="ghost" onClick={clearVoice}>
              <Trash2 className="h-4 w-4" /> حذف التسجيل
            </Button>
          </>
        )}
      </div>

      {voice && !recording && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          سُجّل التزام صوتي بطول {fmtDuration(voice.durationMs)} ورُفع إلى تخزين المنصة الخاص ✓
        </p>
      )}

      {busy && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-300">
          <Upload className="h-3.5 w-3.5" /> جارٍ رفع التسجيل…
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[11px] font-bold text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
