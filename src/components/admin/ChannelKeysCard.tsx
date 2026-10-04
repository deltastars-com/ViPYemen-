/**
 * 🔑 مفاتيح القنوات — تيليجرام ويوتيوب (قسم النشر التلقائي)
 *
 * تتيح للإدارة ربط القنوات مباشرة من اللوحة بلا لمس الخادم:
 *  • تيليجرام: توكن البوت من @BotFather + معرّف القناة/المجموعات
 *  • يوتيوب:   معرّف عميل OAuth + سرّه + رمز التحديث
 *
 * بعد الحفظ يعمل النشر التلقائي فوراً، وبزر «اختبار الاتصال» يتحقق النظام فعلياً
 * من الاتصال (هل البوت مشرف في القناة؟ هل رمز تحديث يوتيوب صالح؟).
 *
 * ⚠️ الأهم: تُحفظ المفاتيح هنا لتعمل المنصة فوراً، ولحماية النسخ الاحتياطية
 *    يجب إضافة نفس القيم إلى **أسرار المستودع** و**متغيرات Convex (Production)**
 *    و**Supabase** — والتذكير معروض أسفل البطاقة دائماً.
 */
import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, Save, ShieldCheck, Stethoscope, Youtube, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Input, Label } from "@/components/ui";

type TestResult = {
  ok: boolean;
  telegram: { ok: boolean; detail: string };
  youtube: { ok: boolean; detail: string };
} | null;

const SOURCE_LABEL: Record<string, string> = {
  env: "متغير بيئة Convex",
  settings: "محفوظة في اللوحة",
  none: "غير مضبوطة",
  default: "افتراضية",
};

function SourceChip({ source }: { source: string }) {
  const tone =
    source === "env"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : source === "settings"
        ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
        : source === "default"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${tone}`}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

export function ChannelKeysCard({ token }: { token: string }) {
  const status = useQuery(api.channelKeys.getStatus, { token });
  const saveTelegram = useMutation(api.channelKeys.saveTelegram);
  const saveYouTube = useMutation(api.channelKeys.saveYouTube);
  const test = useAction(api.channelKeys.test);

  const [tgToken, setTgToken] = useState("");
  const [tgChats, setTgChats] = useState("");
  const [ytId, setYtId] = useState("");
  const [ytSecret, setYtSecret] = useState("");
  const [ytRefresh, setYtRefresh] = useState("");
  const [busy, setBusy] = useState<"" | "tg" | "yt" | "test">("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TestResult>(null);

  async function saveTelegramKeys() {
    setBusy("tg");
    setMessage("");
    try {
      const res = await saveTelegram({
        token,
        // حقل فارغ = لا تُغيّر القيمة المحفوظة
        botToken: tgToken.trim() || undefined,
        chatIds: tgChats.trim() || undefined,
      });
      setMessage(
        res.ready
          ? "✅ حُفظت مفاتيح تيليجرام — النشر التلقائي يعمل الآن."
          : "⚠️ حُفظت значения تيليجرام، وما زالت ناقصة أكملها ثم أعد الحفظ."
      );
      setTgToken("");
      setTgChats("");
    } catch (err: any) {
      setMessage(`⛔ ${err?.message ?? "تعذر الحفظ"}`);
    } finally {
      setBusy("");
    }
  }

  async function saveYouTubeKeys() {
    setBusy("yt");
    setMessage("");
    try {
      const res = await saveYouTube({
        token,
        clientId: ytId.trim() || undefined,
        clientSecret: ytSecret.trim() || undefined,
        refreshToken: ytRefresh.trim() || undefined,
      });
      setMessage(
        res.ready
          ? "✅ حُفظت مفاتيح يوتيوب — رفع الفيديوهات يعمل الآن."
          : `⚠️ حُفظ ما أدخلته، وما زالت ناقصة: ${res.missing.join(" · ")}`
      );
      setYtId("");
      setYtSecret("");
      setYtRefresh("");
    } catch (err: any) {
      setMessage(`⛔ ${err?.message ?? "تعذر الحفظ"}`);
    } finally {
      setBusy("");
    }
  }

  async function runTest() {
    setBusy("test");
    setMessage("");
    setResult(null);
    try {
      setResult(await test({ token }));
    } catch (err: any) {
      setMessage(`⛔ ${err?.message ?? "تعذر الاختبار"}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-cream">مفاتيح تيليجرام ويوتيوب</h3>
          <p className="text-xs text-ink-400">
            أضف المفاتيح هنا ليعمل النشر التلقائي في هاتين القنوات فوراً
          </p>
        </div>
      </div>

      {/* ── تيليجرام ─────────────────────────────────────────── */}
      <div className="mb-4 rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black text-cream">
            <Send className="h-4 w-4 text-sky-300" /> قناة تيليجرام
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {status?.telegram.ready ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                ✓ مضبوطة — يُنشر تلقائياً
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                غير مضبوطة بعد
              </span>
            )}
            <SourceChip source={status?.telegram.tokenSource ?? "none"} />
            <SourceChip source={status?.telegram.chatSource ?? "none"} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>توكن البوت (من @BotFather)</Label>
            <Input
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder={status?.telegram.hasToken ? "•••••••• محفوظ — اكتب توكناً جديداً لتغييره" : "123456789:AA..."}
              autoComplete="off"
            />
          </div>
          <div>
            <Label>القناة أو المجموعات (مفصولة بفاصلة)</Label>
            <Input
              value={tgChats}
              onChange={(e) => setTgChats(e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder={status?.telegram.chatCount ? `${status.telegram.chatCount} وجهة — اكتبها لتغييرها` : "@vipyemen77 , -1001234567890"}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button loading={busy === "tg"} onClick={saveTelegramKeys} className="!py-2 text-xs">
            <Save className="h-4 w-4" /> حفظ مفاتيح تيليجرام
          </Button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
          القناة الافتراضية للمنصة <b className="text-cream" dir="ltr">@vipyemen77</b> والبوت
          الافتراضي <b className="text-cream" dir="ltr">@vipyemen_bot</b> — يجب أن يكون البوت
          مشرفاً في القناة وإلا لن ينشر.
        </p>
      </div>

      {/* ── يوتيوب ───────────────────────────────────────────── */}
      <div className="mb-4 rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black text-cream">
            <Youtube className="h-4 w-4 text-red-400" /> قناة يوتيوب
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {status?.youtube.ready ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                ✓ مضبوطة — الرفع يعمل
              </span>
            ) : (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                ناقصة: {status?.youtube.missing?.join(" · ") ?? "…"}
              </span>
            )}
            <SourceChip source={status?.youtube.source?.youtubeClientId ?? "none"} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>معرّف عميل OAuth</Label>
            <Input value={ytId} onChange={(e) => setYtId(e.target.value)} dir="ltr" className="text-left" placeholder="…apps.googleusercontent.com" autoComplete="off" />
          </div>
          <div>
            <Label>سرّ عميل OAuth</Label>
            <Input value={ytSecret} onChange={(e) => setYtSecret(e.target.value)} dir="ltr" className="text-left" placeholder="GOCSPX-…" autoComplete="off" />
          </div>
          <div>
            <Label>رمز التحديث</Label>
            <Input value={ytRefresh} onChange={(e) => setYtRefresh(e.target.value)} dir="ltr" className="text-left" placeholder="1//0eXa…" autoComplete="off" />
          </div>
        </div>
        <div className="mt-3">
          <Button loading={busy === "yt"} onClick={saveYouTubeKeys} className="!py-2 text-xs">
            <Save className="h-4 w-4" /> حفظ مفاتيح يوتيوب
          </Button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
          تحتاج المفاتيح الثلاثة معاً. الفراغ في أي حقل يعني «اترك القيمة المحفوظة كما هي».
        </p>
      </div>

      {/* ── الاختبار الحي ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" loading={busy === "test"} onClick={runTest} className="!py-2 text-xs">
          <Stethoscope className="h-4 w-4" /> اختبار الاتصال فعلياً
        </Button>
        <p className="text-[10px] text-ink-400">
          يتحقق من البوت وصلاحياته في القناة، ومن صلاحية رمز تحديث يوتيوب — بلا رفع أي شيء.
        </p>
      </div>

      {result && (
        <div className="mt-3 space-y-1.5">
          {(["telegram", "youtube"] as const).map((k) => (
            <p
              key={k}
              className={`rounded-lg border p-2.5 text-[11px] font-bold leading-relaxed ${
                result[k].ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {result[k].ok ? "✅" : "⛔"} {k === "telegram" ? "تيليجرام" : "يوتيوب"} — {result[k].detail}
            </p>
          ))}
        </div>
      )}

      {message && (
        <p className="mt-3 rounded-lg border border-gold-500/30 bg-gold-500/10 p-2.5 text-[11px] font-bold text-gold-200">
          {message}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/[0.06] p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-black text-sky-200">
          <ShieldCheck className="h-3.5 w-3.5" /> لا تنسَ النسخ الاحتياطية
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-sky-100/80">
          ما تحفظه هنا يعمل فوراً، لكن حفاظاً على النسخ الاحتياطية أضف نفس المفاتيح إلى:
          <b className="text-cream"> أسرار المستودع (GitHub Secrets)</b> ←{" "}
          <b className="text-cream">متغيرات Convex (Production)</b> ←{" "}
          <b className="text-cream">Supabase</b>. الأولوية دائماً لمتغير بيئة Convex إن وُجد،
          فلوحة التحكم احتياط سريع لا بديل عن الأسرار.
        </p>
      </div>
    </Card>
  );
}