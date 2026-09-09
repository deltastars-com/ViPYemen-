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

function ChannelSetupCard() {
  const getSetup = useAction(api.channels.getChannelSetup);
  const [setup, setSetup] = useState<{ telegram: boolean; whatsapp: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    getSetup()
      .then((s) => live && setSetup(s))
      .catch(() => live && setSetup({ telegram: false, whatsapp: false }));
    return () => {
      live = false;
    };
  }, [getSetup]);

  const channels = [
    {
      key: "telegram" as const,
      name: "تيليجرام",
      ready: setup?.telegram ?? false,
      vars: "TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID",
      hint: "توكن البوت و معرف القناة (عدة قنوات مفصولة بفواصل)",
    },
    {
      key: "whatsapp" as const,
      name: "واتساب (Cloud API)",
      ready: setup?.whatsapp ?? false,
      vars: "WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_BROADCAST_TO",
      hint: "توكن واتساب أعمال، معرّف الرقم، وأرقام البث المستهدفة",
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
      <p className="mt-3 rounded-lg border border-ink-600/50 bg-ink-950/40 p-3 text-[11px] leading-relaxed text-ink-300">
        أضف هذه المتغيرات في <b className="text-gold-300">Convex Dashboard → Project Settings → Environment Variables</b>.
        بدون مفاتيح تبقى المنصة تعمل بالكامل وتنشر الإعلانات على الواجهة، وعند ضبط المفاتيح
        يبدأ النشر التلقائي للقنوات فوراً — مع زر «إعادة نشر للقنوات» على كل عنصر منشور.
      </p>
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