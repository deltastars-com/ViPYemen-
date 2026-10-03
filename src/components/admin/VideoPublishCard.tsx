/**
 * 🎬 النشر الاحترافي للفيديوهات على قناة يوتيوب — ضغطة واحدة
 *
 * التدفق الكامل داخل اللوحة:
 *   1. اختيار فيديو ← قراءة أبعاده وتحديد اتجاهه (عمودي/أفقي).
 *   2. الفيديو العمودي يُحوَّل آلياً إلى صيغة يوتيوب الأفقية 16:9 (1280×720)
 *      مع الحفاظ على الصوت — تحويل كامل داخل المتصفح بلا خادم.
 *   3. رفع الملف إلى تخزين المنصة ثم نشره فعلياً على قناة يوتيوب عبر
 *      Data API v3 (رفع متجدد OAuth) — ويرجع رابط المنشور مباشرة.
 *
 * الأفقي يُنشر كما هو بلا تحويل. أي فشل يُبلَّغ عنه بالعربية ولا يُسقط
 * بقية عمليات النشر.
 */
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Film, Loader2, UploadCloud, Youtube } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  convertToLandscape,
  probeVideo,
  type VideoProbe,
} from "@/lib/videoLandscape";

type Setup = { ready: boolean; missing: string[]; note: string } | null;

export function VideoPublishCard({ token }: { token: string }) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const getSetup = useAction(api.youtube.getSetup);
  const uploadVideo = useAction(api.youtube.uploadVideo);

  const [setup, setSetup] = useState<Setup>(null);
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    let alive = true;
    getSetup()
      .then((s) => {
        if (alive) setSetup(s as Setup);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [getSetup]);

  async function pick(fileList: FileList | null) {
    const f = fileList?.[0];
    if (!f) return;
    setError("");
    setResult(null);
    setFile(f);
    setTitle((prev) => prev || f.name.replace(/\.[^.]+$/, ""));
    try {
      setProbe(await probeVideo(f));
    } catch {
      setProbe(null);
      setError("تعذر قراءة أبعاد الفيديو — تأكد من صيغة الملف (MP4/WebM).");
    }
  }

  async function publish() {
    if (!file) {
      setError("اختر ملف الفيديو أولاً.");
      return;
    }
    if (title.trim().length < 3) {
      setError("اكتب عنواناً واضحاً للفيديو (3 أحرف على الأقل).");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(0);
    try {
      // 1) تحويل آلي: عمودي ← أفقي متوافق مع يوتيوب
      let blob: Blob = file;
      if (probe?.needsConversion) {
        setStatus("يُحوَّل الفيديو إلى صيغة يوتيوب الأفقية 16:9…");
        blob = await convertToLandscape(file, (p) => setProgress(p));
      } else {
        setStatus("الفيديو أفقي بالفعل — جاهز للنشر…");
        setProgress(100);
      }
      const named = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") + (probe?.needsConversion ? "-landscape" : "") + ".webm",
        { type: blob.type || "video/webm" }
      );

      // 2) رفع الملف إلى تخزين المنصة
      setStatus("يُرفع الفيديو إلى تخزين المنصة…");
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": named.type }, body: named });
      const { storageId } = (await res.json()) as { storageId: string };
      if (!res.ok || !storageId) throw new Error("تعذر رفع ملف الفيديو إلى التخزين");

      // 3) النشر الفعلي على قناة يوتيوب
      setStatus("يُنشر الفيديو على قناة يوتيوب…");
      const out = await uploadVideo({
        token,
        storageId,
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.trim() || undefined,
        privacyStatus: privacy,
      });
      if (!out.ok) throw new Error(out.error);
      setResult({ url: out.url, title: out.title });
      setStatus("");
      setProgress(100);
    } catch (err: any) {
      setStatus("");
      setError(err?.message ?? "تعذر النشر — حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const orientationLabel = !probe
    ? ""
    : probe.orientation === "portrait"
      ? `عمودي ${probe.width}×${probe.height} — سيُحوَّل آلياً إلى أفقي 16:9`
      : probe.orientation === "landscape"
        ? `أفقي ${probe.width}×${probe.height} — متوافق مع يوتيوب`
        : `مربّع ${probe.width}×${probe.height} — سيُحوَّل آلياً إلى أفقي 16:9`;

  return (
    <Card className="p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-cream">
        <Youtube className="h-4 w-4 text-rose-400" />
        🎬 نشر فيديو على قناة يوتيوب (تحويل آلي + ضغطة واحدة)
      </h3>
      <p className="mb-4 text-[11px] leading-relaxed text-ink-300">
        اختر الفيديو، ويعمل النظام تلقائياً: يحوّل الفيديو العمودي إلى صيغة يوتيوب الأفقية 16:9 مع
        الصوت، ثم يرفعه وينشره على قناة المنصة. الفيديو الأفقي يُنشر كما هو.
      </p>

      <div className="space-y-3">
        {setup && !setup.ready && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] font-bold leading-relaxed text-amber-200">
            ⚠️ {setup.note}
          </p>
        )}

        <div>
          <Label>ملف الفيديو</Label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-ink-600/70 px-4 py-4 text-ink-300 transition-colors hover:border-rose-500/60 hover:text-rose-300">
            <UploadCloud className="h-6 w-6" />
            <span className="text-xs font-bold">
              {file ? file.name : "اختر فيديو (عمودي أو أفقي) — MP4 / WebM"}
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pick(e.target.files)}
            />
          </label>
          {probe && (
            <p className="mt-1.5 rounded-lg border border-ink-700/60 bg-ink-950/50 px-3 py-2 text-[11px] font-bold text-ink-200">
              <Film className="ms-1 inline h-3.5 w-3.5 text-rose-300" />
              {orientationLabel}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>عنوان الفيديو *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="خدمات ViP Yemen في اليمن" />
          </div>
          <div>
            <Label>الصلاحية</Label>
            <Select value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
              <option value="public">عام (منشور)</option>
              <option value="unlisted">غير مدرج (رابط فقط)</option>
              <option value="private">خاص</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>الوصف</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="وصف الفيديو…"
          />
        </div>

        <div>
          <Label>الوسوم (مفصولة بفاصلة)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ViP Yemen, اليمن, توظيف, عقارات" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={publish} loading={busy} className="!py-2 text-xs">
            <Youtube className="h-4 w-4" />
            {probe?.needsConversion ? "تحويل ونشر بضغطة زر" : "نشر على يوتيوب"}
          </Button>
          {busy && (
            <span className="inline-flex items-center gap-2 text-[11px] font-bold text-gold-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status} {progress > 0 && progress < 100 ? `${progress}%` : ""}
            </span>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">
            {error}
          </p>
        )}

        {result && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-bold leading-relaxed text-emerald-300">
            ✅ نُشر «{result.title}» على يوتيوب —{" "}
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">
              {result.url}
            </a>
          </p>
        )}
      </div>
    </Card>
  );
}
