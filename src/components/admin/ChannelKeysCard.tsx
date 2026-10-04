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
import { KeyRound, Save, ShieldCheck, Stethoscope, Youtube, Send, Radio, Bot, RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

type TestResult = {
  ok: boolean;
  telegram: { ok: boolean; detail: string };
  youtube: { ok: boolean; detail: string };
} | null;

type BotMode = {
  ok: boolean;
  detail: string;
  botUsername: string;
  webhookActive: boolean;
  webhookUrl: string;
  expectedUrl: string;
  pending: number;
  telegramError: string;
  hasSecret: boolean;
  pollingEnabled: boolean;
  lastPollAt: number;
  lastError: string;
  commands: { command: string; description: string }[];
};

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
  const loadProfile = useAction(api.channelKeys.getBotProfile);
  const setProfile = useAction(api.channelKeys.setBotProfile);
  const loadWebhook = useAction(api.telegramBot.webhookStatus);
  const enableWebhook = useAction(api.telegramBot.registerWebhook);
  const disableWebhook = useAction(api.telegramBot.unregisterWebhook);
  const publishCommands = useAction(api.telegramBot.syncCommands);
  const pollImmediately = useAction(api.telegramBot.pollNow);
  const togglePolling = useMutation(api.telegramBot.setPolling);

  const [tgToken, setTgToken] = useState("");
  const [tgChats, setTgChats] = useState("");
  const [ytId, setYtId] = useState("");
  const [ytSecret, setYtSecret] = useState("");
  const [ytRefresh, setYtRefresh] = useState("");
  const [busy, setBusy] = useState<
    "" | "tg" | "yt" | "test" | "profileLoad" | "profileSave" | "webhookLoad" | "webhookOn" | "webhookOff" | "commands" | "pollNow" | "pollToggle"
  >("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<TestResult>(null);
  const [botName, setBotName] = useState("");
  const [botDesc, setBotDesc] = useState("");
  const [botShort, setBotShort] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [botMode, setBotMode] = useState<BotMode | null>(null);
  const [botMsg, setBotMsg] = useState("");

  async function refreshWebhook() {
    setBusy("webhookLoad");
    setBotMsg("");
    try {
      const r = await loadWebhook({ token });
      setBotMode({
        ok: r.ok,
        detail: r.detail,
        botUsername: r.botUsername,
        webhookActive: r.webhookActive,
        webhookUrl: r.webhookUrl,
        expectedUrl: r.expectedUrl,
        pending: r.pending,
        telegramError: r.telegramError,
        hasSecret: r.hasSecret,
        pollingEnabled: r.pollingEnabled,
        lastPollAt: r.lastPollAt,
        lastError: r.lastError,
        commands: r.commands,
      });
    } catch (err: any) {
      setBotMsg(`⛔ ${err?.message ?? "تعذّر قراءة الحالة"}`);
    } finally {
      setBusy("");
    }
  }

  /** ملف إجرائي واحد للأزرار الخمسة: يشغّل فعلاً ثم يحدّث الحالة. */
  async function runBotAction(
    key: "webhookOn" | "webhookOff" | "commands" | "pollNow",
    fn: () => Promise<{ ok: boolean; detail?: string }>
  ) {
    setBusy(key);
    setBotMsg("");
    try {
      const r = await fn();
      setBotMsg(r.ok ? r.detail ?? "✅ تم" : `⛔ ${r.detail ?? "فشل"}`);
    } catch (err: any) {
      setBotMsg(`⛔ ${err?.message ?? "تعذّر التنفيذ"}`);
    } finally {
      setBusy("");
    }
    try {
      const r = await loadWebhook({ token });
      setBotMode({
        ok: r.ok,
        detail: r.detail,
        botUsername: r.botUsername,
        webhookActive: r.webhookActive,
        webhookUrl: r.webhookUrl,
        expectedUrl: r.expectedUrl,
        pending: r.pending,
        telegramError: r.telegramError,
        hasSecret: r.hasSecret,
        pollingEnabled: r.pollingEnabled,
        lastPollAt: r.lastPollAt,
        lastError: r.lastError,
        commands: r.commands,
      });
    } catch {
      /* التحديث補助ي غير حرج */
    }
  }

  async function flipPolling() {
    if (!botMode) return;
    const next = !botMode.pollingEnabled;
    setBusy("pollToggle");
    setBotMsg("");
    try {
      await togglePolling({ token, enabled: next });
      setBotMsg(
        next
          ? "✅ فُعّل الاستعلام الدوري (كل ٥ ثوان) — يعمل حين لا يكون الويب هوك مُفعّلاً."
          : "🔇 أُوقف الاستعلام الدوري."
      );
    } catch (err: any) {
      setBotMsg(`⛔ ${err?.message ?? "تعذّر التغيير"}`);
    } finally {
      setBusy("");
    }
    try {
      const r = await loadWebhook({ token });
      setBotMode({ ...botMode, pollingEnabled: r.pollingEnabled });
    } catch {
      /* تجاهل */
    }
  }

  async function readProfile() {
    setBusy("profileLoad");
    setProfileMsg("");
    try {
      const r = await loadProfile({ token });
      if (!r.ok) {
        setProfileMsg(`⛔ ${r.detail}`);
        return;
      }
      setBotName(r.name ?? "");
      setBotDesc(r.description ?? "");
      setBotShort(r.shortDescription ?? "");
      setProfileMsg(
        r.username
          ? `✅ هُبطت هوية البوت @${r.username} الحالية — عدّل ما تريد ثم اضغط «تطبيق».`
          : "✅ هُبطت الهوية الحالية."
      );
    } catch (err: any) {
      setProfileMsg(`⛔ ${err?.message ?? "تعذر الاتصال"}`);
    } finally {
      setBusy("");
    }
  }

  async function applyProfile() {
    setBusy("profileSave");
    setProfileMsg("");
    try {
      const r = await setProfile({
        token,
        name: botName,
        description: botDesc,
        shortDescription: botShort,
      });
      if (!("results" in r) || !r.results) {
        setProfileMsg(`⛔ ${r.detail}`);
        return;
      }
      const failed = r.results.filter((x) => !x.ok);
      setProfileMsg(
        failed.length === 0
          ? "✅ حُدِّثت هوية البوت بنجاح — ولم يُمَسّ التوكن ولا صلاحيات النشر."
          : r.results.map((x) => `${x.ok ? "✅" : "⛔"} ${x.field}: ${x.detail}`).join(" — ")
      );
    } catch (err: any) {
      setProfileMsg(`⛔ ${err?.message ?? "تعذر التطبيق"}`);
    } finally {
      setBusy("");
    }
  }

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

      {/* ── هوية البوت عبر Bot API (بلا BotFather) ──────────── */}
      <div className="mb-4 rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-cream">هوية البوت (اسمه ووصفه)</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              loading={busy === "profileLoad"}
              onClick={readProfile}
              className="!py-1.5 text-[11px]"
            >
              قراءة الهوية الحالية
            </Button>
            <Button loading={busy === "profileSave"} onClick={applyProfile} className="!py-1.5 text-[11px]">
              <Save className="h-3.5 w-3.5" /> تطبيق
            </Button>
          </div>
        </div>
        <div className="grid gap-3">
          <div>
            <Label>اسم البوت (حد ٦٤ حرفاً)</Label>
            <Input value={botName} onChange={(e) => setBotName(e.target.value)} />
          </div>
          <div>
            <Label>الوصف في ملف البوت (حد ٥١٢ حرفاً)</Label>
            <Textarea
              value={botDesc}
              onChange={(e) => setBotDesc(e.target.value)}
              rows={6}
              placeholder="نبذة عن المنصة وأقسامها وطريقة عمل البوت…"
            />
            <p className="mt-1 text-[10px] text-ink-400">{botDesc.trim().length} / 512 حرفاً</p>
          </div>
          <div>
            <Label>الوصف القصير (حد ١٢٠ حرفاً)</Label>
            <Input value={botShort} onChange={(e) => setBotShort(e.target.value)} />
            <p className="mt-1 text-[10px] text-ink-400">{botShort.trim().length} / 120 حرفاً</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5 text-[10px] leading-relaxed text-emerald-200/90">
          ✅ هذه الطريقة تتصل بتيليجرام مباشرةً عبر Bot API بلا المرور على @BotFather.
          <b className="text-cream"> التوكن لا يُبطَل ولا يتغير</b> — توثيق تيليجرام ينصّ أن إبطال
          التوكن لا يحدث إلا بالأمر <b className="text-cream" dir="ltr">revokeWebhookToken</b>
          (أو <b className="text-cream" dir="ltr">/revoke</b>)، وهذه الدالة ليست منه، فلا تتأثر
          صلاحية النشر في القناة ولا تتوقف الرسائل.
        </p>
        {profileMsg && (
          <p className="mt-2 rounded-lg border border-gold-500/30 bg-gold-500/10 p-2.5 text-[11px] font-bold text-gold-200">
            {profileMsg}
          </p>
        )}
      </div>

      {/* ── وضع ردّ البوت (Webhook + استعلام دوري) ───────────── */}
      <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/[0.04] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-black text-cream">
            <Bot className="h-4 w-4 text-sky-300" /> وضع ردّ البوت (يستقبل ويجيب)
          </p>
          <Button
            variant="ghost"
            loading={busy === "webhookLoad"}
            onClick={refreshWebhook}
            className="!py-1.5 text-[11px]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> قراءة الحالة
          </Button>
        </div>

        {botMode ? (
          <div className="mb-3 grid gap-2 text-[11px] font-bold sm:grid-cols-2">
            <p
              className={`rounded-lg border p-2.5 ${
                botMode.webhookActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {botMode.webhookActive ? "🟢" : "🟡"} الردّ:{" "}
              {botMode.webhookActive ? "فوري عبر Webhook" : "غير مفعّل — لا يردّ على الرسائل"}
              {botMode.botUsername ? ` (@${botMode.botUsername})` : ""}
            </p>
            <p
              className={`rounded-lg border p-2.5 ${
                botMode.pollingEnabled && !botMode.webhookActive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-ink-700/60 bg-ink-900/40 text-ink-300"
              }`}
            >
              <Radio className="mr-1 inline h-3.5 w-3.5" />
              الاستعلام الدوري (getUpdates):{" "}
              {botMode.pollingEnabled ? "مُفعّل" : "معطّل"}
              {botMode.webhookActive ? " (متوقف لأن الويب هوك شغّال)" : ""}
              {botMode.lastPollAt ? ` — آخر فحص ${new Date(botMode.lastPollAt).toLocaleTimeString("ar-EG")}` : ""}
            </p>
            {botMode.webhookActive && (
              <p className="rounded-lg border border-ink-700/60 bg-ink-900/40 p-2.5 text-ink-300" dir="ltr">
                <span className="font-black text-cream">POST </span>
                {botMode.webhookUrl}
              </p>
            )}
            <p className="rounded-lg border border-ink-700/60 bg-ink-900/40 p-2.5 text-ink-300">
              🔐 سرّ البوابة: {botMode.hasSecret ? "مضبوط ✅" : "غير مضبوط ⛔ — فعّل الويب هوك ليُنشأ"} · رسائل
              بانتظار المعالجة: {botMode.pending}
            </p>
            {(botMode.telegramError || botMode.lastError) && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300 sm:col-span-2">
                ⛔ خطأ تيليجرام: {botMode.telegramError || botMode.lastError}
              </p>
            )}
            {botMode.commands.length > 0 && (
              <p className="rounded-lg border border-ink-700/60 bg-ink-900/40 p-2.5 text-ink-300 sm:col-span-2">
                ⌨️ أوامر منشورة في تيليجرام ({botMode.commands.length}):{" "}
                {botMode.commands.map((c) => `/${c.command}`).join(" · ")}
              </p>
            )}
          </div>
        ) : (
          <p className="mb-3 text-[11px] leading-relaxed text-ink-400">
            اضغط «قراءة الحالة» لتعرف هل البوت مربوط ببوابة ردّ، وهل الأوامر منشورة في تيليجرام.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            loading={busy === "webhookOn"}
            onClick={() => runBotAction("webhookOn", () => enableWebhook({ token }))}
            className="!py-2 text-xs"
          >
            <Radio className="h-4 w-4" /> تفعيل الرد الفوري (Webhook)
          </Button>
          <Button
            variant="ghost"
            loading={busy === "webhookOff"}
            onClick={() => runBotAction("webhookOff", () => disableWebhook({ token }))}
            className="!py-2 text-xs"
          >
            إيقاف الويب هوك
          </Button>
          <Button
            variant="ghost"
            loading={busy === "commands"}
            onClick={() => runBotAction("commands", () => publishCommands({ token }))}
            className="!py-2 text-xs"
          >
            <Send className="h-4 w-4" /> نشر الأوامر في تيليجرام
          </Button>
          <Button
            variant="ghost"
            loading={busy === "pollNow"}
            onClick={() => runBotAction("pollNow", () => pollImmediately({ token }))}
            className="!py-2 text-xs"
          >
            استعلام الآن
          </Button>
          {botMode && (
            <Button
              variant="ghost"
              loading={busy === "pollToggle"}
              onClick={flipPolling}
              className="!py-2 text-xs"
            >
              {botMode.pollingEnabled ? "🔇 إيقاف الاستعلام الدوري" : "▶️ تفعيل الاستعلام الدوري"}
            </Button>
          )}
        </div>

        <p className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/[0.06] p-2.5 text-[10px] leading-relaxed text-sky-100/85">
          ℹ️ <b className="text-cream">الويبهوك</b> يجعل الرد فورياً (مستحسن في الإنتاج)، و
          <b className="text-cream"> الاستعلام الدوري</b> بديل كل ٥ ثوان يعمل فقط حين لا يكون الويب هوك
          مُفعّلاً — لأن تيليجرام لا يسمح بالجمع بينهما. البوابة محميّة بترويسة سرّية فلا يمرّ منها إلا
          تيليجرام. بعد التفعيل جرّب: أرسل <b className="text-cream" dir="ltr">/start</b> أو{" "}
          <b className="text-cream" dir="ltr">/jobs</b> للبوت في المحادثة الخاصة.
        </p>
        {botMsg && (
          <p className="mt-2 rounded-lg border border-gold-500/30 bg-gold-500/10 p-2.5 text-[11px] font-bold text-gold-200">
            {botMsg}
          </p>
        )}
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