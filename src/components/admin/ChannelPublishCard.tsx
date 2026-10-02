/**
 * 🛠️ النشر اليدوي الاحتياطي في قنوات المنصة الرقمية
 *
 * النشر التلقائي هو المسار الأساسي (كل طلب/عرض/إعلان يُنشر آلياً عند اعتماده)،
 * وهذه الأداة هي المسار الاحتياطي اليدوي: نص حر + اختيار القنوات + زر واحد،
 * مع عرض النتيجة الحقيقية لكل قناة (نجاح/فشل + السبب الدقيق بالعربية).
 *
 * وتشمل القنوات أيضاً «إشعار داخل المنصة» فيصل الإعلان لكل مستخدمي التطبيق —
 * فهي قناة منصة كاملة لا قناة خارجية.
 *
 * وزر «قناة واتساب (فتح + نسخ)» مسار بلا أي توكن: يفتح رابط قناة المنصة وينسخ
 * النص إلى الحافظة — يعمل من أي جهاز ودائماً، حتى لو تعطل كل شيء آخر.
 */
import { useState } from "react";
import { useAction } from "convex/react";
import { Copy, Home, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Label, Textarea } from "@/components/ui";
import { publishToWhatsAppChannel } from "@/lib/whatsappChannel";

type ChannelTarget = { id: string; label: string; hint?: string };

const CHANNELS: ChannelTarget[] = [
  { id: "telegram", label: "📢 تيليجرام" },
  { id: "whatsapp", label: "💬 واتساب (API/OpenWA)" },
  { id: "facebook_page", label: "📘 صفحة فيسبوك" },
  { id: "facebook_group", label: "👥 مجموعة فيسبوك" },
  { id: "platform", label: "🏠 إشعار داخل المنصة", hint: "يظهر لكل مستخدمي التطبيق" },
];

const LABELS: Record<string, string> = Object.fromEntries(CHANNELS.map((c) => [c.id, c.label]));

export function ChannelPublishCard({ token, compact = false }: { token: string; compact?: boolean }) {
  const publishManual = useAction(api.channels.publishManual);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<
    { channel: string; ok: boolean; paused: boolean; detail: string }[]
  >([]);

  const [selected, setSelected] = useState<string[]>(
    CHANNELS.filter((c) => c.id !== "platform").map((c) => c.id)
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("تعذّر النسخ تلقائياً — حدّد النص وانسخه يدوياً.");
    }
  }

  async function run() {
    if (!text.trim()) {
      setError("اكتب نص المنشور أولاً.");
      return;
    }
    if (selected.length === 0) {
      setError("اختر قناة واحدة على الأقل.");
      return;
    }
    setBusy(true);
    setError("");
    setResults([]);
    try {
      const res = await publishManual({
        token,
        text,
        title: "نشر يدوي من لوحة التحكم",
        channels: selected,
      });
      const rows = (res.results as typeof results) ?? [];
      setResults(rows);
      if (!res.ok && rows.length === 0) {
        setError(res.error ?? "تعذّر النشر — تحقق من القنوات المختارة.");
      }
    } catch (err: any) {
      setError(err?.message ?? "تعذّر الاتصال بالخادم — حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-cream">
        <Send className="h-4 w-4 text-gold-400" />
        🛠️ نشر يدوي في قنوات المنصة (احتياطي)
      </h3>
      <p className="mb-4 text-[11px] leading-relaxed text-ink-300">
        الأساس هو <strong className="text-gold-300">النشر التلقائي</strong> — كل طلب أو عرض أو
        إعلان يُنشر آلياً لحظة اعتماده. وهذه الأداة احتياطٌ يدوي كامل: اكتب النص، اختر القنوات
        (خارجية + إشعار داخل المنصة)، وانشر بضغطة واحدة مع النتيجة الحقيقية لكل قناة وسبب أي فشل.
      </p>

      <div className="space-y-3">
        <div>
          <Label>نص المنشور</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={compact ? 4 : 6}
            placeholder="مثال: مطلوب مصنع معتمد في صنعاء — راتب مجزٍ، والتقديم عبر المنصة…"
          />
          <p className="mt-1 text-[10px] text-ink-400">
            {text.trim().length} حرفاً · يُرسل النص كما هو إلى كل قناة محددة
          </p>
        </div>

        <div>
          <Label>القنوات المستهدفة</Label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  title={c.hint}
                  onClick={() => toggle(c.id)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                    on
                      ? "border-gold-400/50 bg-gold-400/15 text-gold-300"
                      : "border-white/10 bg-white/5 text-ink-300 hover:bg-white/10"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {c.label}
                  {c.id === "platform" && <Home className="ms-1 inline h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={run} loading={busy} className="!py-2 text-xs">
            <Send className="h-4 w-4" />
            نشر الآن إلى القنوات المحددة
          </Button>
          <Button variant="success" onClick={() => publishToWhatsAppChannel(text)} className="!py-2 text-xs" disabled={!text.trim()}>
            قناة واتساب (فتح + نسخ)
          </Button>
          <Button variant="ghost" onClick={copyText} className="!py-2 text-xs" disabled={!text.trim()}>
            <Copy className="h-4 w-4" />
            {copied ? "نُسخ ✅" : "نسخ النص"}
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">
            {error}
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-black text-gold-300">نتيجة النشر لكل قناة:</p>
            {results.map((r) => (
              <p
                key={r.channel}
                className={`rounded-lg border p-2.5 text-[11px] font-bold leading-relaxed ${
                  r.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {r.ok ? "✅" : "⛔"} {LABELS[r.channel] ?? r.channel}
                {r.paused ? " (متوقفة آلياً)" : ""} — {r.detail}
              </p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
