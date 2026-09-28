import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Save,
  Smartphone,
  Share2,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  Fingerprint,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import {
  enrollBiometric,
  disableBiometric,
  isBiometricSupported,
  isBiometricEnrolled,
} from "@/lib/biometric";
import { api } from "../../convex/_generated/api";
import { Button, Card, Input, Label, Spinner } from "@/components/ui";

const CONTACT_FIELDS = [
  { key: "brandName", label: "اسم المنصة" },
  { key: "brandTagline", label: "الشعار التعريفي" },
  { key: "whatsappNumber", label: "رقم واتساب المنصة (لعرضه للعملاء)" },
  { key: "phone", label: "رقم الهاتف" },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "address", label: "العنوان" },
];

const SOCIAL_FIELDS = [
  { key: "facebook", label: "فيسبوك" },
  { key: "tiktok", label: "تيك توك" },
  { key: "instagram", label: "إنستغرام" },
  { key: "twitter", label: "تويتر / X" },
  { key: "linkedin", label: "لينكدإن" },
  { key: "youtube", label: "يوتيوب" },
  { key: "telegram", label: "قناة واتساب / تيليجرام" },
  { key: "beacons", label: "Beacons" },
  { key: "linkfly", label: "Linkfly" },
  { key: "taplink", label: "Taplink" },
  { key: "allmylinks", label: "AllMyLinks" },
];

export function AdminSettings({ token }: { token: string }) {
  const settings = useQuery(api.settings.getAll, { token });
  const updateSetting = useMutation(api.settings.updateSetting);
  const ensureDefaults = useMutation(api.settings.ensureDefaults);
  const changePassword = useMutation(api.users.changePassword);

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Password change form state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    if (settings) {
      setValues(Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v ?? "")])));
    }
  }, [settings]);

  useEffect(() => {
    ensureDefaults().catch(() => {});
  }, [ensureDefaults]);

  async function handleSave() {
    setBusy(true);
    setSaved(false);
    try {
      for (const [key, value] of Object.entries(values)) {
        await updateSetting({ token, key, value });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwDone(false);
    if (pwNew !== pwConfirm) {
      setPwError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (pwNew.length < 8) {
      setPwError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setPwBusy(true);
    try {
      await changePassword({ token, currentPassword: pwCurrent, newPassword: pwNew });
      setPwDone(true);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err: any) {
      setPwError(err.message ?? "تعذر تغيير كلمة المرور");
    } finally {
      setPwBusy(false);
    }
  }

  if (!settings) {
    return (
      <div className="flex justify-center py-20 text-gold-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
            <Smartphone className="h-4 w-4 text-gold-400" />
            بيانات التواصل
          </h3>
          <div className="space-y-3">
            {CONTACT_FIELDS.map((f) => (
              <div key={f.key}>
                <Label>{f.label}</Label>
                <Input
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  dir={f.key === "whatsappNumber" || f.key === "phone" ? "ltr" : "rtl"}
                  className={f.key === "whatsappNumber" || f.key === "phone" ? "text-left" : ""}
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
              <Share2 className="h-4 w-4 text-gold-400" />
              روابط التواصل الاجتماعي
            </h3>
            <div className="space-y-3">
              {SOCIAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Input
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    dir="ltr"
                    className="text-left"
                    placeholder="https://"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
              <ShieldCheck className="h-4 w-4 text-gold-400" />
              أمان الحساب
            </h3>
            <p className="text-xs leading-relaxed text-ink-300">
              بريد الإدارة: <b className="text-cream" dir="ltr">vipservicesyemen@gmail.com</b>
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                غيّر كلمة المرور الافتراضية فوراً بعد أول دخول. في حال نسيان
                كلمة المرور استخدم استعادة كلمة المرور من صفحة تسجيل الدخول.
              </p>
            </div>
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <div>
                <Label>كلمة المرور الحالية</Label>
                <Input
                  type="password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <Label>كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  required
                />
              </div>
              <div>
                <Label>تأكيد كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور"
                  required
                />
              </div>
              {pwError && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">
                  {pwError}
                </p>
              )}
              {pwDone && (
                <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  تم تغيير كلمة المرور بنجاح
                </p>
              )}
              <Button type="submit" variant="ghost" loading={pwBusy} className="!py-2 text-xs">
                <KeyRound className="h-4 w-4 text-gold-400" />
                تغيير كلمة المرور
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <ChannelSetupCard />

      <WhatsAppConnectCard token={token} />

      <FacebookConnectCard token={token} />

      <BiometricCard accountName={values.brandName || "admin"} />

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={busy}>
          <Save className="h-4 w-4" />
          حفظ جميع الإعدادات
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            تم الحفظ — ستنعكس التغييرات فوراً
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 🔗 ربط فيسبوك بتوكن طويل الأجل
 *
 * الوضع «تبديل» يأخذ توكن Graph API Explorer القصير + معرّف التطبيق وسرّه،
 * ويبدله بتوكن مستخدم طويل الأجل (٦٠ يوماً) ثم يستخرج توكن الصفحة الذي لا
 * ينتهي — ويحفظ المفاتيح ليتم تجديدها آلياً قبل انتهائها.
 */
function FacebookConnectCard({ token }: { token: string }) {
  const connect = useAction(api.facebook.connectFacebook);
  const refresh = useAction(api.facebookStore.refreshNow);
  const status = useQuery(api.facebookStore.getFacebookStatus, { token });

  const [mode, setMode] = useState<"exchange" | "direct">("exchange");
  const [accessToken, setAccessToken] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [pageId, setPageId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");

  async function renewNow() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const result = await refresh({ token });
      setReport({
        ok: result.ok,
        pageName: result.pageName ?? status?.pageName ?? "—",
        pageId: result.pageId ?? status?.pageId ?? "—",
        permanent: true,
        daysLeft: null,
        autoRenew: true,
        groupOk: undefined,
        warnings: result.ok
          ? []
          : [result.reason === "no-app-credentials" ? "التجديد الآلي يحتاج أول ربط بالوضع «تبديل» مع App ID و App Secret" : (result.error ?? "تعذر التجديد")],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const result = await connect({
        token,
        mode,
        accessToken: accessToken.trim(),
        appId: appId.trim() || undefined,
        appSecret: appSecret.trim() || undefined,
        pageId: pageId.trim() || undefined,
        groupId: groupId.trim() || undefined,
      });
      setReport(result);
      setAccessToken("");
      setAppSecret("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1877f2]/40 bg-[#1877f2]/15 text-[#4da3ff]">
          <Share2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-extrabold text-cream">ربط فيسبوك بتوكن طويل الأجل</h3>
          <p className="text-xs text-ink-400">
            تبديل آلي لتوكن قصير الأجل ← توكن مستخدم ٦٠ يوماً ← توكن صفحة لا ينتهي،
            مع تجديد ذاتي قبل انتهائه فلا يتوقف النشر
          </p>
        </div>
        {status?.connected ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            {status.permanent ? "توكن دائم" : status.tokenDaysLeft !== null ? `يبقى ${status.tokenDaysLeft} يوم` : "مربوط"}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-black text-rose-300">
            <XCircle className="h-3 w-3" />
            غير مربوط
          </span>
        )}
      </div>

      {status?.connected && (
        <div className="mb-3 grid gap-2 text-[11px] sm:grid-cols-2">
          <div className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
            <span className="text-ink-400">الصفحة: </span>
            {status.pageName || status.pageId || "—"}
            {status.tokenPrefix && <span className="text-ink-400"> · {status.tokenPrefix}</span>}
          </div>
          <div className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
            <span className="text-ink-400">التجديد الذاتي: </span>
            {status.autoRenew
              ? `مُفعّل${status.userTokenDaysLeft !== null ? ` (توكن المستخدم يبقى ${status.userTokenDaysLeft} يوماً)` : ""}`
              : "غير مُفعّل — أضف App ID + App Secret مرة واحدة"}
          </div>
          {status.canPost === false && (
            <p className="sm:col-span-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 font-bold text-rose-200">
              ⛔ صلاحية النشر غير ممنوحة للتوكن (pages_manage_posts) — المنشورات على الصفحة
              لن تُنشر حتى تُعيد توليد التوكن مع تحديد هذه الصلاحية ثم تربطه هنا.
            </p>
          )}
          {status.canPost === true && (
            <p className="sm:col-span-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-bold text-emerald-200">
              ✅ صلاحية النشر ممنوحة (pages_manage_posts) — النشر التلقائي على الصفحة يعمل.
            </p>
          )}
          {status.lastError && (
            <p className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-bold text-amber-200">
              ⚠️ {status.lastError}
            </p>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {([
          { key: "exchange" as const, label: "تبديل توكن قصير الأجل (موصى به)" },
          { key: "direct" as const, label: "لديّ توكن جاهز (صفحة/مستخدم)" },
        ]).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMode(option.key)}
            className={`rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors ${
              mode === option.key
                ? "border-gold-500/60 bg-gold-500/10 text-gold-300"
                : "border-ink-600/60 bg-ink-900/50 text-ink-300 hover:text-cream"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mode === "exchange" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>App ID</Label>
              <Input value={appId} onChange={(e) => setAppId(e.target.value)} dir="ltr" className="text-left" placeholder="123456789012345" />
            </div>
            <div>
              <Label>App Secret</Label>
              <Input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} dir="ltr" className="text-left" placeholder="••••••••••••" />
            </div>
          </div>
        )}
        <div>
          <Label>{mode === "exchange" ? "التوكن قصير الأجل (Graph API Explorer)" : "التوكن الجاهز"}</Label>
          <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} dir="ltr" className="text-left" placeholder="EAAG…" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>معرّف الصفحة (اختياري)</Label>
            <Input value={pageId} onChange={(e) => setPageId(e.target.value)} dir="ltr" className="text-left" placeholder="102672588647591" />
          </div>
          <div>
            <Label>معرّف المجموعة (اختياري)</Label>
            <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} dir="ltr" className="text-left" placeholder="346010664332427" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="gold" loading={busy} disabled={!accessToken.trim()} onClick={submit} className="!py-2 text-xs">
            <Share2 className="h-4 w-4" />
            {mode === "exchange" ? "ابدأ التبديل والربط" : "تحقق واحفظ التوكن"}
          </Button>
          {status?.hasUserToken && (
            <Button variant="ghost" loading={busy} onClick={renewNow} className="!py-2 text-xs">
              <RefreshCw className="h-4 w-4" />
              جدّد التوكن الآن
            </Button>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
            ⚠️ {error}
          </p>
        )}

        {report && (
          <div className="space-y-1.5 rounded-lg border border-ink-600/50 bg-ink-950/50 p-3 text-[11px]">
            <p className={report.ok ? "font-black text-emerald-300" : "font-black text-amber-300"}>
              {report.ok ? "✅ تم الربط بنجاح" : "⚠️ تم الحفظ مع ملاحظات"}
            </p>
            <p className="text-ink-200">
              الصفحة: <b className="text-cream">{report.pageName}</b> ({report.pageId})
              {typeof report.pageFans === "number" && report.pageFans > 0 && (
                <span className="text-ink-400"> · {report.pageFans.toLocaleString("en-US")} متابع</span>
              )}
            </p>
            <p className="text-ink-200">
              مدة التوكن:{" "}
              {report.permanent
                ? "دائم — لا ينتهي ✅"
                : report.daysLeft !== null
                  ? `يتبقى ${report.daysLeft} يوماً`
                  : "غير محددة"}
              {report.autoRenew && <span className="text-emerald-300"> · التجديد الذاتي مُفعّل</span>}
            </p>
            {report.groupOk !== undefined && (
              <p className="text-ink-300">
                المجموعة: {report.groupOk ? `✅ ${report.groupName ?? report.groupId}` : "⚠️ غير متاحة للنشر عبر الـ API"}
              </p>
            )}
            {report.canPost === false && (
              <p className="rounded border border-rose-500/40 bg-rose-500/10 p-2 font-bold text-rose-200">
                ⛔ صلاحية النشر مفقودة:{" "}
                <span dir="ltr">{(report.missingPostScopes ?? ["pages_manage_posts"]).join(", ")}</span>
                {" "}— أعد توليد التوكن من Graph API Explorer مع تحديدها وأعد الربط.
              </p>
            )}
            {report.canPost === true && (
              <p className="font-bold text-emerald-300">✅ صلاحية النشر ممنوحة — الصفحة جاهزة للنشر الآلي</p>
            )}
            {(report.scopes?.length ?? 0) > 0 && (
              <p className="text-ink-400" dir="ltr">
                {report.scopes.join(" · ")}
              </p>
            )}
            {report.warnings?.length > 0 && (
              <ul className="list-inside list-disc space-y-1 text-amber-200">
                {report.warnings.map((w: string) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <p className="pt-1 text-[10px] text-ink-400">
              {report.canPost === false
                ? "تم تحديث قنوات المنصة — وبانتظار توكن يحمل صلاحية pages_manage_posts ليبدأ النشر على الصفحة، وتبقى تلجرام وواتساب تعملان طبيعياً."
                : "تم تحديث قنوات المنصة — النشر التلقائي على الصفحة يعمل الآن، والفحص يسجّل النتيجة في لوحة الكنترول ← الأتمتة الشاملة."}
            </p>
          </div>
        )}

        <details className="rounded-lg border border-ink-600/50 bg-ink-950/40 p-3">
          <summary className="cursor-pointer text-[11px] font-bold text-ink-300 hover:text-cream">
            كيف أحصل على التوكن ومعرّف التطبيق؟ (خطوات مختصرة)
          </summary>
          <ol className="mt-2 list-inside list-decimal space-y-1.5 text-[11px] leading-relaxed text-ink-300">
            <li>
              افتح <b className="text-cream" dir="ltr">developers.facebook.com</b> ← تطبيقك ← Settings ← Basic، وانسخ
              <b className="text-cream"> App ID</b> و<b className="text-cream">App Secret</b>.
            </li>
            <li>
              من <b className="text-cream" dir="ltr">Tools → Graph API Explorer</b> اختر تطبيقك، ثم أضف الصلاحيات:
              <code className="mx-1 text-[9px] text-cream" dir="ltr">pages_manage_posts</code>
              <code className="mx-1 text-[9px] text-cream" dir="ltr">pages_read_engagement</code>
              <code className="mx-1 text-[9px] text-cream" dir="ltr">pages_show_list</code>
            </li>
            <li>
              اضغط <b className="text-cream">Generate Access Token</b>، ووافق على الصفحة المطلوبة عند السؤال، ثم انسخ التوكن والصقه هنا.
            </li>
            <li>
              اضغط «ابدأ التبديل والربط» — سيتولى النظام الباقي: توكن طويل الأجل ← توكن صفحة لا ينتهي ← حفظ + تجديد آلي.
            </li>
          </ol>
          <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] font-bold text-amber-200">
            ملاحظة: النشر التلقائي على <b>المجموعة</b> عبر الـ API أوقفته فيسبوك لتطبيقات كثيرة — تبقى القناة تعمل بلا خطأ،
            ويُبلَّغ عنها بوضوح، بينما الصفحة وقنوات تلجرام/واتساب تُنشر تلقائياً بالكامل.
          </p>
        </details>
      </div>
    </Card>
  );
}

/**
 * 💬 تشغيل قناة واتساب (WhatsApp Cloud API) — تُدار بالكامل من اللوحة.
 *
 * لا تحتاج أي متغيرات بيئة: يُدخل المشرف توكن Meta ومعرّف رقم الإرسال وقائمة
 * المستلمين، فيتحقق النظام فعلياً عبر Graph API، يرسل رسالة تجريبية اختيارية،
 * ثم يحفظ الإعدادات ويشغّل القناة فوراً — وبدون نافذة الـ 24 ساعة عند استخدام
 * قالب مُعتمد.
 */
function WhatsAppConnectCard({ token }: { token: string }) {
  const connect = useAction(api.whatsapp.connectWhatsApp);
  const status = useQuery(api.whatsapp.getWhatsAppStatus, { token });

  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [recipients, setRecipients] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLang, setTemplateLang] = useState("ar");
  const [sendTest, setSendTest] = useState(true);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const result = await connect({
        token,
        accessToken: accessToken.trim(),
        phoneNumberId: phoneNumberId.trim(),
        recipients: recipients.split(/[,،\s]+/).filter(Boolean),
        templateName: templateName.trim(),
        templateLang: templateLang.trim() || "ar",
        sendTest,
      });
      setReport(result);
      setAccessToken("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
          <Send className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-extrabold text-cream">تشغيل قناة واتساب (WhatsApp Cloud API)</h3>
          <p className="text-xs text-ink-400">
            وصل البيانات مرة واحدة — يتحقق النظام منها فعلياً، يرسل رسالة تجريبية، ثم ينشر
            كل إعلان وعرض على أرقام قناتك تلقائياً وبلا انقطاع
          </p>
        </div>
        {status?.connected ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            مُشغّلة
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            غير مُشغّلة
          </span>
        )}
      </div>

      {status?.connected && (
        <div className="mb-3 grid gap-2 text-[11px] sm:grid-cols-2">
          <div className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
            <span className="text-ink-400">الرقم: </span>
            {status.displayPhone || "—"}
            {status.verifiedName && <span className="text-ink-400"> · {status.verifiedName}</span>}
          </div>
          <div className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
            <span className="text-ink-400">المستلمون: </span>
            {status.recipients.length > 0 ? `${status.recipients.length} رقم` : "لا يوجد مستلمون بعد"}
          </div>
          <div className="sm:col-span-2 rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
            <span className="text-ink-400">قالب النشر: </span>
            {status.template
              ? `${status.template} (${status.templateLang}) — نشر دائم بلا نافذة ٢٤ ساعة`
              : "غير مُحدد — الرسائل الحرة تُسلَّم فقط خلال 24 ساعة من آخر رسالة من العميل"}
          </div>
          {status.lastError && (
            <p className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-bold text-amber-200">
              ⚠️ {status.lastError}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <Label>توكن Meta الدائم (System User Token)</Label>
          <Input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            dir="ltr"
            className="text-left"
            placeholder={status?.connected ? `${status.tokenPrefix} — اتركه فارغاً للإبقاء على المحفوظ` : "EAAG…"}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>معرّف رقم الإرسال (Phone number ID)</Label>
            <Input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder={status?.phoneNumberId || "123456789012345"}
            />
          </div>
          <div>
            <Label>أرقام المستلمين (مفصولة بفاصلة)</Label>
            <Input
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder="967711780999, 9677…"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>اسم القالب المُعتمد (اختياري لكن موصى به)</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder="platform_post"
            />
          </div>
          <div>
            <Label>لغة القالب</Label>
            <Input
              value={templateLang}
              onChange={(e) => setTemplateLang(e.target.value)}
              dir="ltr"
              className="text-left"
              placeholder="ar"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-[11px] font-bold text-ink-300">
          <input
            type="checkbox"
            checked={sendTest}
            onChange={(e) => setSendTest(e.target.checked)}
            className="h-4 w-4 accent-emerald-500"
          />
          إرسال رسالة تجريبية للمستلم الأول للتأكد من الوصول
        </label>

        <div className="flex flex-wrap gap-2">
          <Button variant="gold" loading={busy} onClick={submit} className="!py-2 text-xs">
            <Send className="h-4 w-4" />
            تحقق وشغّل قناة واتساب
          </Button>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
            ⚠️ {error}
          </p>
        )}

        {report && (
          <div className="space-y-1.5 rounded-lg border border-ink-600/50 bg-ink-950/50 p-3 text-[11px]">
            <p className="font-black text-emerald-300">✅ تم تشغيل قناة واتساب</p>
            <p className="text-ink-200">
              الرقم: <b className="text-cream">{report.displayPhone ?? report.phoneNumberId ?? "—"}</b>
              {report.verifiedName && <span className="text-ink-400"> · {report.verifiedName}</span>}
            </p>
            <p className="text-ink-200">
              المستلمون: <b className="text-cream">{report.recipients?.length ?? 0}</b> رقم
              {report.template ? ` · قالب: ${report.template}` : " · بلا قالب (نافذة ٢٤ ساعة)"}
            </p>
            <p className={report.testSent ? "text-emerald-300" : "text-amber-200"}>
              الرسالة التجريبية: {report.testSent ? "وصلت بنجاح ✅" : (report.testError ?? "لم تُرسل")}
            </p>
            {report.warnings?.length > 0 && (
              <ul className="list-inside list-disc space-y-1 text-amber-200">
                {report.warnings.map((w: string) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <details className="rounded-lg border border-ink-600/50 bg-ink-950/40 p-3">
          <summary className="cursor-pointer text-[11px] font-bold text-ink-300 hover:text-cream">
            كيف أحصل على التوكن ومعرّف الرقم وقالب النشر؟ (خطوات مختصرة)
          </summary>
          <ol className="mt-2 list-inside list-decimal space-y-1.5 text-[11px] leading-relaxed text-ink-300">
            <li>
              افتح <b className="text-cream" dir="ltr">developers.facebook.com</b> ← تطبيقك ← WhatsApp ←{" "}
              <b className="text-cream" dir="ltr">API Setup</b>، وانسخ{" "}
              <b className="text-cream">Phone number ID</b>.
            </li>
            <li>
              للتوكن الدائم: <b className="text-cream" dir="ltr">Business Settings → Users → System users</b> ← أنشئ مستخدماً
              نظامياً ← Add assets (تطبيقك + حساب واتساب) ←{" "}
              <b className="text-cream">Generate token</b> مع الصلاحيتين{" "}
              <code className="mx-1 text-[9px] text-cream" dir="ltr">whatsapp_business_messaging</code>
              <code className="mx-1 text-[9px] text-cream" dir="ltr">whatsapp_business_management</code>.
            </li>
            <li>
              للنشر <b className="text-cream">الدائم</b> أنشئ قالباً من{" "}
              <b className="text-cream" dir="ltr">WhatsApp → Message templates</b> بمعامل واحد{" "}
              <code className="mx-1 text-[9px] text-cream" dir="ltr">{`{{1}}`}</code> وانتظر اعتماده، ثم اكتب اسمه هنا.
            </li>
            <li>
              أضف أرقام المستلمين بالصيغة الدولية <span dir="ltr">9677xxxxxxxx</span> ثم اضغط «تحقق وشغّل قناة واتساب».
            </li>
          </ol>
        </details>
      </div>
    </Card>
  );
}

function ChannelSetupCard() {
  const getSetup = useAction(api.channels.getChannelSetup);
  const [setup, setSetup] = useState<{ telegram: boolean; whatsapp: boolean; facebook: boolean; facebookGroup: boolean; _diag?: Record<string, unknown> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getSetup()
      .then((s) => { if (live) { setSetup(s); setError(null); } })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[ChannelSetup] Action failed:", msg);
        if (live) { setSetup({ telegram: false, whatsapp: false, facebook: false, facebookGroup: false }); setError(msg); }
      });
    return () => {
      live = false;
    };
  }, [getSetup]);

  const channels = [
    {
      key: "telegram" as const,
      name: "تيليجرام @vipyemen77",
      ready: setup?.telegram ?? false,
      vars: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID",
      hint: "بوت @vipyemen_bot → قناة @vipyemen77",
    },
    {
      key: "whatsapp" as const,
      name: "واتساب (Cloud API)",
      ready: setup?.whatsapp ?? false,
      vars: "WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_BROADCAST_TO",
      hint: "توكن واتساب أعمال، معرّف الرقم، وأرقام البث المستهدفة",
    },
    {
      key: "facebook" as const,
      name: "فيسبوك — صفحة VIP YEMEN",
      ready: setup?.facebook ?? false,
      vars: "FACEBOOK_ACCESS_TOKEN + FACEBOOK_PAGE_ID",
      hint: "صفحة vipyemen1 — نشر تلقائي بالصور والنص",
    },
    {
      key: "facebookGroup" as const,
      name: "فيسبوك — جروب VIP YEMEN",
      ready: setup?.facebookGroup ?? false,
      vars: "FACEBOOK_ACCESS_TOKEN + FACEBOOK_GROUP_ID",
      hint: "جروب 346010664332427 — نشر تلقائي بالنص والرابط",
    },
  ];

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-cream">النشر التلقائي للقنوات</h3>
          <p className="text-xs text-ink-400">
            كل إعلان أو عرض أو منشور يُنشر من لوحة التحكم يُرسل تلقائياً إلى قنوات المنصة
          </p>
        </div>
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-[11px] font-bold text-red-300">⚠️ خطأ في الاتصال بالخادم:</p>
          <p className="mt-1 text-[10px] text-red-400" dir="ltr">{error}</p>
          <p className="mt-1 text-[10px] text-ink-400">تأكد من أن المتصفح مسجّل الدخول كمدير.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {channels.map((c) => (
          <div
            key={c.key}
            className={`rounded-xl border p-3 ${
              c.ready ? "border-emerald-500/30 bg-emerald-500/5" : "border-ink-600/60 bg-ink-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-cream">{c.name}</span>
              {setup === null ? (
                <Spinner className="h-4 w-4 text-gold-400" />
              ) : c.ready ? (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  مضبوط — يُنشر تلقائياً
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  <XCircle className="h-3 w-3" />
                  غير مضبوط
                </span>
              )}
            </div>
            <p className="mt-2 text-[10px] font-bold text-ink-400" dir="ltr" style={{ textAlign: "right" }}>
              {c.vars}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-300">{c.hint}</p>
          </div>
        ))}
      </div>
      {setup?._diag && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[10px] font-bold text-ink-400 hover:text-cream">
            🔍 معلومات التشخيص (اضغط للفتح)
          </summary>
          <div className="mt-2 rounded-lg border border-ink-600/50 bg-ink-950/40 p-3 text-[10px] leading-relaxed text-ink-300" dir="ltr">
            <pre className="whitespace-pre-wrap">{JSON.stringify(setup._diag, null, 2)}</pre>
            {setup._diag && !(setup._diag as Record<string, unknown>).fbTokenPresent && (
              <p className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] font-bold text-amber-200">
                ❌ FACEBOOK_ACCESS_TOKEN غير موجود في بيئة Convex الإنتاجية.<br/>
                أضفه في: Production → Settings → Environment Variables<br/>
                (وليس Development → Environment Variables)
              </p>
            )}
            {setup._diag && !!(setup._diag as Record<string, unknown>).fbTokenPresent && (
              <p className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] font-bold text-emerald-200">
                ✅ التوكن موجود ومُحمَّل من: {String((setup._diag as Record<string, unknown>).fbTokenSource)}
              </p>
            )}
          </div>
        </details>
      )}
      <div className="mt-3 space-y-2">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-[11px] font-bold text-amber-200">
            ⚠️ مهم: المتغيرات يجب أن تكون على بيئة <b>Production</b> وليس <b>Development</b>
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-300/80">
            1. افتح <b className="text-cream">dashboard.convex.dev</b> → مشروع VIPYemen<br/>
            2. في الشريط العلوي اختر <b className="text-cream">Production</b> (وليس Development)<br/>
            3. اذهب إلى <b className="text-cream">Settings → Environment Variables</b><br/>
            4. أضف: <code className="text-[9px] text-cream" dir="ltr">FACEBOOK_ACCESS_TOKEN</code>
          </p>
        </div>
        <p className="rounded-lg border border-ink-600/50 bg-ink-950/40 p-3 text-[11px] leading-relaxed text-ink-300">
          بدون مفاتيح تبقى المنصة تعمل بالكامل وتنشر الإعلانات على الواجهة، وعند ضبط المفاتيح
          يبدأ النشر التلقائي للقنوات فوراً — مع زر «إعادة نشر للقنوات» على كل عنصر منشور.
        </p>
      </div>
    </Card>
  );
}

function BiometricCard({ accountName }: { accountName: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [enrolled, setEnrolled] = useState(isBiometricEnrolled());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    isBiometricSupported().then(setSupported);
  }, []);

  async function handleEnroll() {
    setBusy(true);
    setMsg("");
    const ok = await enrollBiometric(accountName);
    setBusy(false);
    if (ok) {
      setEnrolled(true);
      setMsg("تم التفعيل — ستُطلب البصمة أو الوجه عند كل دخول للوحة التحكم");
    } else {
      setMsg("تعذّر التفعيل — تأكد من تسجيل بصمتك/وجهك في إعدادات الجهاز");
    }
  }

  function handleDisable() {
    disableBiometric();
    setEnrolled(false);
    setMsg("تم إلغاء التأمين بالبصمة");
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
          <Fingerprint className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-cream">التأمين بالبصمة والوجه</h3>
          <p className="text-xs text-ink-400">
            حماية حيوية حقيقية عبر مستشعر الجهاز (بصمة / بصمة الوجه) لفتح لوحة التحكم
          </p>
        </div>
      </div>
      {supported === false ? (
        <p className="rounded-lg border border-ink-600/50 bg-ink-800/60 p-3 text-xs leading-relaxed text-ink-300">
          هذا الجهاز لا يدعم التحقق الحيوي — افتح لوحة التحكم من هاتف يدعم البصمة (WebAuthn على الويب، BiometricPrompt داخل التطبيق).
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {enrolled ? (
            <>
              <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                مُفعّل على هذا الجهاز
              </span>
              <Button variant="ghost" onClick={handleDisable} className="!py-2 text-xs">
                إلغاء التفعيل
              </Button>
            </>
          ) : (
            <Button onClick={handleEnroll} loading={busy} className="!py-2 text-xs">
              <Fingerprint className="h-4 w-4" />
              تفعيل التأمين بالبصمة
            </Button>
          )}
        </div>
      )}
      {msg && <p className="mt-3 text-xs leading-relaxed text-gold-300">{msg}</p>}
    </Card>
  );
}