import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Save, Smartphone, Globe, Share2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Input, Label, Spinner } from "@/components/ui";
import { getAdminToken } from "@/lib/convex";

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

  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

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
              بريد الإدارة: <b className="text-cream" dir="ltr">vipservicesyemen@gmail.com</b> — يمكنك
              تغيير كلمة المرور في أي وقت من صفحة تسجيل الدخول (نسيت كلمة المرور).
              يُنصح بتغيير كلمة المرور الافتراضية فور أول دخول.
            </p>
            <a href="/auth" className="btn-ghost mt-3 !py-2 text-xs">إدارة كلمة المرور</a>
          </Card>
        </div>
      </div>

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