import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  PackageOpen,
  Store,
  ShieldCheck,
  KeyRound,
  Smartphone,
  Apple,
  Save,
  Landmark,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { AdminReleases } from "./AdminReleases";
import { AdminFinance } from "./AdminFinance";
import { AdminPayments } from "./AdminPayments";
import { AdminSecureDocs } from "./AdminSecureDocs";
import { AdminSettings } from "./AdminSettings";

/**
 * 👨‍💻 قسم المطور — كل ما يخص البنية التقنية والمالية والأمان في مكان واحد:
 * الإصدارات، روابط المتاجر (Android/iOS — يُفعَّل رابط iOS تلقائياً عند حفظه)،
 * النظام المالي، سندات الدفع، الخزنة، الإعدادات، وحماية البصمة.
 *
 * Developer hub: releases, store links (iOS activates automatically once the
 * App Store URL is saved), finance, payment receipts, vault, settings, biometrics.
 */

type SubTab = "releases" | "store" | "finance" | "payments" | "vault" | "settings";

function StoreLinks({ token }: { token: string }) {
  const { lang } = useLang();
  const settings = useQuery(api.settings.getAll, { token });
  const update = useMutation(api.settings.updateSetting);
  const [android, setAndroid] = useState("");
  const [ios, setIos] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setAndroid((settings.androidDownloadUrl as string) ?? "");
    setIos((settings.iosDownloadUrl as string) ?? "");
  }, [settings]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await update({ token, key: "androidDownloadUrl", value: android.trim() });
      await update({ token, key: "iosDownloadUrl", value: ios.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const iosActive = ios.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="card-surface p-6">
        <h3 className="flex items-center gap-2 text-sm font-black text-gold-300">
          <Store className="h-4 w-4" />
          {L("روابط تحميل التطبيقات — التذييل يتبعها تلقائياً", "App download links — footer follows automatically")}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-ink-300">
          {L(
            "أيقونة أندرويد في تذييل الموقع والتطبيق تشير الآن إلى APKPure. عند نشر التطبيق على App Store، الصق رابط التطبيق هنا واحفظه — أيقونة iOS ستُفعَّل تلقائياً وتوجّه المستخدمين لتنزيل أحدث إصدار، دون أي تعديل في الكود.",
            "The Android icon in the footer now points to APKPure. Once the app is live on the App Store, paste its URL here and save — the iOS icon activates automatically and directs users to the latest release, with zero code changes."
          )}
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <Label>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                {L("رابط تحميل Android (APKPure متفعل افتراضياً)", "Android download URL (APKPure active by default)")}
              </span>
            </Label>
            <Input dir="ltr" value={android} onChange={(e) => setAndroid(e.target.value)} placeholder="https://apkpure.com/vipyemen/com.vip.yemen/download" />
          </div>
          <div>
            <Label>
              <span className="inline-flex items-center gap-1.5">
                <Apple className="h-3.5 w-3.5 text-ink-300" />
                {L("رابط تحميل iOS (App Store) — اتركه فارغاً ليبقى الزر بانتظار", "iOS download URL (App Store) — leave empty to keep the button waiting")}
              </span>
            </Label>
            <Input dir="ltr" value={ios} onChange={(e) => setIos(e.target.value)} placeholder="https://apps.apple.com/app/idXXXXXXXXXX" />
            {ios.trim() ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {L("أيقونة iOS مُفعّلة الآن في التذييل — توجّه لأحدث إصدار تلقائياً", "iOS footer icon is now active — points to the latest release automatically")}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-ink-400">
                {L("الزر جاهز وينتظر فقط حفظ الرابط — كل ملفات النشر مكتملة في قسم المطور.", "The button is ready and waits only for the URL — all publishing files are complete in the Developer section.")}
              </p>
            )}
          </div>
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            {L("حفظ الروابط", "Save links")}
          </Button>
          {saved && <p className="text-xs font-bold text-emerald-400">{L("تم الحفظ ✓ — يعمل فوراً على كل الواجهات", "Saved ✓ — live across all interfaces instantly")}</p>}
          <div className="rounded-xl border border-ink-600/60 bg-ink-950/50 p-3.5 text-[11px] leading-relaxed text-ink-400">
            <span className="font-bold text-ink-200">{L("الحالة الحالية:", "Current status:")}</span>{" "}
            Android: <span className="font-bold text-emerald-400">{L("مفعّل", "active")}</span> · iOS:{" "}
            <span className={iosActive ? "font-bold text-emerald-400" : "font-bold text-amber-400"}>
              {iosActive ? L("مفعّل", "active") : L("بانتظار رابط App Store", "waiting for App Store URL")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const items = [
    {
      title: L("حماية لوحة التحكم بالبصمة والوجه", "Dashboard fingerprint & face protection"),
      desc: L(
        "لوحة التحكم محمية بتحقق حيوي (WebAuthn / Biometric) — عند تسجيل بصمتك على الجهاز، لا تُفتح اللوحة إلا بعد التحقق. زر «قفل بالبصمة» يمنحك قفلاً فورياً عند الابتعاد.",
        "The dashboard is protected by biometric verification (WebAuthn). Once enrolled on the device, the panel only opens after verification; the lock button gives instant protection when you step away."
      ),
      active: true,
    },
    {
      title: L("تشفير كلمات المرور PBKDF2 (120,000 تكرار)", "PBKDF2 password hashing (120,000 iterations)"),
      desc: L(
        "كلمات المرور مُجزّأة بـ PBKDF2-SHA256 مع ملح عشوائي لكل حساب — لا تُخزّن أبداً كنص صريح.",
        "Passwords are hashed with PBKDF2-SHA256 and a per-account random salt — never stored in plaintext."
      ),
      active: true,
    },
    {
      title: L("جلسات آمنة وحماية من التخمين", "Secure sessions & brute-force protection"),
      desc: L(
        "جلسات موقّعة بمدة 30 يوماً مع تتبع محاولات الدخول وقفل مؤقت عند التكرار الفاشل.",
        "Signed 30-day sessions with login-attempt tracking and temporary lockout after repeated failures."
      ),
      active: true,
    },
    {
      title: L("رؤوس أمان CSP + COOP على النطاق المباشر", "CSP + COOP security headers on the live domain"),
      desc: L(
        "سياسة أمان محتوى صارمة (بدون unsafe-inline) وسياسة Cross-Origin-Opener-Policy مع HSTS على vipyemen / Vercel.",
        "Strict Content-Security-Policy (no unsafe-inline), Cross-Origin-Opener-Policy and HSTS on the Vercel deployment."
      ),
      active: true,
    },
    {
      title: L("الخزنة — أسرار الإدارة داخل اللوحة فقط", "Vault — admin secrets inside the dashboard only"),
      desc: L(
        "مفاتيح التوقيع وFirebase وVercel تُحفظ في جدول secureDocs ولا يصل إليها أحد سوى الإدارة — لا تُرفع أبداً في المستودع.",
        "Signing keys, Firebase and Vercel secrets live in the secureDocs table — admin-only access, never committed to the repository."
      ),
      active: true,
    },
    {
      title: L("استعادة كلمة المرور عبر البريد الرسمي", "Password reset via the official email"),
      desc: L(
        "رمز استعادة من 6 أرقام يُرسل إلى vipservicesyemen@gmail.com مع صلاحية زمنية واستخدام مرة واحدة.",
        "A 6-digit reset code is emailed to vipservicesyemen@gmail.com with expiry and single-use enforcement."
      ),
      active: true,
    },
  ];
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.title} className="card-surface flex items-start gap-3 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
            <ShieldCheck className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-cream">{it.title}</h4>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                {L("مفعّل", "Active")}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-300">{it.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminDeveloper({ token }: { token: string }) {
  const { lang } = useLang();
  const [sub, setSub] = useState<SubTab>("releases");
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  const SUB_TABS: { key: SubTab; label: string; icon: typeof PackageOpen }[] = [
    { key: "releases", label: L("الإصدارات والبناء", "Releases & builds"), icon: PackageOpen },
    { key: "store", label: L("روابط المتاجر", "Store links"), icon: Store },
    { key: "finance", label: L("النظام المالي", "Finance"), icon: Landmark },
    { key: "payments", label: L("سندات الدفع", "Payment receipts"), icon: Wallet },
    { key: "vault", label: L("الخزنة والأسرار", "Vault & secrets"), icon: KeyRound },
    { key: "settings", label: L("الأمان والإعدادات", "Security & settings"), icon: ShieldCheck },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {SUB_TABS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSub(s.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              sub === s.key
                ? "bg-gold-500/15 text-gold-300"
                : "border border-ink-600/60 text-ink-300 hover:text-cream"
            }`}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {sub === "releases" && <AdminReleases token={token} />}
      {sub === "store" && <StoreLinks token={token} />}
      {sub === "finance" && <AdminFinance token={token} />}
      {sub === "payments" && <AdminPayments token={token} />}
      {sub === "vault" && <AdminSecureDocs token={token} />}
      {sub === "settings" && (
        <div className="space-y-6">
          <SecurityTab />
          <AdminSettings token={token} />
        </div>
      )}
    </div>
  );
}
