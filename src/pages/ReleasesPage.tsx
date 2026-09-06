import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Download,
  Globe,
  Smartphone,
  Apple,
  FileCode2,
  MonitorDown,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import { formatDate } from "@/lib/utils";

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  web: { label: "تطبيق ويب (PWA)", icon: Globe, color: "text-gold-300 border-gold-500/30 bg-gold-500/10" },
  android: { label: "Android (APK/AAB)", icon: Smartphone, color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  ios: { label: "iOS", icon: Apple, color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
  docs: { label: "وثائق وكود مصدري", icon: FileCode2, color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
};

export function ReleasesPage() {
  const releases = useQuery(api.releases.listPublished);

  return (
    <div className="animate-fade-up">
      <section className="border-b border-ink-700/50 py-14 text-center">
        <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
          <Download className="h-3.5 w-3.5" />
          الإصدارات والتطبيقات
        </span>
        <h1 className="section-title mt-4 text-cream">
          حمّل منصة <span className="gold-text">ViP Yemen</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">
          المنصة متاحة كتطبيق ويب تقدمي (PWA) يعمل بدون إنترنت، مع إصدارات
          Android وiOS وملفات الكود المصدري والوثائق — جميع الإصدارات تُحدَّث
          تلقائياً من قسم الإصدارات في لوحة التحكم.
        </p>
      </section>

      <section className="container-app py-12">
        {!releases ? (
          <div className="flex justify-center py-16 text-gold-400">
            <Spinner className="h-8 w-8" />
          </div>
        ) : releases.length === 0 ? (
          <>
            <EmptyState title="لا توجد إصدارات مرفوعة بعد" hint="تظهر الإصدارات هنا فور رفعها من الإدارة" />
            <InstallGuide />
          </>
        ) : (
          <>
            <div className="space-y-4">
              {(releases as any[]).map((r) => {
                const meta = PLATFORM_META[r.platform] ?? PLATFORM_META.web;
                return (
                  <motion.div key={r._id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="card-surface-hover flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${meta.color}`}>
                        <meta.icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-cream">{r.title}</h3>
                          <Badge className={meta.color}>v{r.version}</Badge>
                          <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-200">{meta.label}</Badge>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{r.description}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-ink-400">
                          <span>تاريخ النشر: {formatDate(r.createdAt)}</span>
                          {r.size && <span dir="ltr">الحجم: {r.size}</span>}
                          {r.notes && <span>ملاحظات: {r.notes}</span>}
                        </div>
                      </div>
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-gold shrink-0 !px-4 !py-2 text-xs"
                        >
                          <Download className="h-4 w-4" />
                          تحميل
                        </a>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            <InstallGuide />
          </>
        )}
      </section>
    </div>
  );
}

function InstallGuide() {
  return (
    <div className="mt-12 grid gap-5 md:grid-cols-2">
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <MonitorDown className="h-5 w-5" />
          </div>
          <h3 className="text-base font-extrabold text-cream">تثبيت التطبيق (PWA)</h3>
        </div>
        <ol className="list-decimal space-y-2 pr-5 text-[13px] leading-relaxed text-ink-300">
          <li>افتح المنصة في متصفح Chrome أو Safari على هاتفك.</li>
          <li>اضغط زر «تثبيت / Install» أو «مشاركة» ثم «إضافة إلى الشاشة الرئيسية».</li>
          <li>سيظهر أيقونة المنصة على شاشتك — يفتح التطبيق كتطبيق مستقل ويعمل بدون إنترنت.</li>
        </ol>
      </Card>
      <Card className="p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-extrabold text-cream">مصادر التحميل الرسمية</h3>
        </div>
        <ul className="space-y-2 text-[13px] font-semibold text-ink-300">
          <li>• تطبيق Android: يُرفع بصيغتي APK وAAB للحزمة com.vip.yemen</li>
          <li>• تطبيق iOS: عبر App Store بنفس الحزمة com.vip.yemen</li>
          <li>• الكود المصدري الكامل والوثائق متاحة في مستودع المشروع وقسم الإصدارات</li>
          <li>• سياسة الخصوصية: <a className="text-gold-400 underline underline-offset-4" href="/privacy-policy">من هنا</a></li>
        </ul>
        <a
          href="https://wa.me/967711780999?text=مرحباً، أريد الحصول على نسخة من تطبيق ViP Yemen"
          target="_blank"
          rel="noreferrer"
          className="btn-ghost mt-4 !py-2 text-xs"
        >
          <MessageCircle className="h-4 w-4 text-[#4ade80]" />
          اطلب نسخة عبر واتساب
        </a>
      </Card>
    </div>
  );
}