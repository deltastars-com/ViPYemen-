import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BellRing, Megaphone, MessagesSquare, ShieldCheck, Sparkles, Users } from "lucide-react";
import { CHANNELS } from "@/lib/channels";
import { ChannelsSection, ChannelIcon } from "@/components/ChannelsSection";
import { PLATFORM_WHATSAPP_LINK } from "@/lib/utils";

const BENEFITS = [
  {
    icon: Megaphone,
    title: "نشر لحظي",
    text: "كل منشور معتمد من لوحة التحكم يصل لقنواتنا فوراً — بدون تأخير.",
  },
  {
    icon: BellRing,
    title: "تنبيهات فورية",
    text: "إشعارات فورية لكل جديد: وظائف، عقارات، منتجات، وعروض حصرية.",
  },
  {
    icon: Users,
    title: "مجتمع واسع",
    text: "انضم لآلاف المتابعين وتابع الفرص قبل الجميع على منصات متعددة.",
  },
  {
    icon: ShieldCheck,
    title: "محتوى موثوق",
    text: "كل ما يُنشر على قنواتنا مرّ بالمراجعة الإدارية والتدقيق أولاً.",
  },
];

export function ChannelsPage() {
  return (
    <div className="container-app py-12">
      {/* ============ Hero ============ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-gold-500/25 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-8 text-center sm:p-14"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.16), transparent 55%)",
          }}
        />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-500/40 bg-gold-500/10">
            <Sparkles className="h-8 w-8 text-gold-400" />
          </div>
          <h1 className="text-2xl font-black text-cream sm:text-4xl">
            قنواتنا <span className="gold-text">الرقمية</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
            تابع منصة ViP Yemen على جميع قنواتنا الرسمية — كل وظيفة، عقار، منتج،
            عرض ترويجي، ومنشور معتمد يُنشر تلقائياً على قنواتنا لتصل إليك الفرص
            لحظة بلحظة.
          </p>
        </div>
      </motion.section>

      {/* ============ Channel cards ============ */}
      <section className="mt-10">
        <ChannelsSection />
      </section>

      {/* ============ Interconnection strip ============ */}
      <section className="mt-8 rounded-2xl border border-ink-700/50 bg-ink-900/50 p-6">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-cream">قنوات مترابطة — محتوى واحد متزامن</p>
              <p className="text-xs text-ink-300">
                المنشور المعتمد يظهر على الواجهة وعلى جميع القنوات معاً وبشكل آلي
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {CHANNELS.map((c) => (
              <a
                key={c.id}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${c.name} — ${c.cta}`}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-all hover:-translate-y-0.5 ${c.badge}`}
              >
                <ChannelIcon id={c.id} className="h-4 w-4" />
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Why join ============ */}
      <section className="mt-14">
        <h2 className="section-title text-center text-cream">
          لماذا <span className="gold-text">تنضم لقنواتنا؟</span>
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card-surface p-5 transition-all hover:-translate-y-0.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-black text-cream">{b.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="mt-14 rounded-3xl border border-gold-500/25 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-8 text-center sm:p-12">
        <h2 className="text-xl font-black text-cream sm:text-2xl">
          لا تفوّت أي فرصة — انضم الآن لجميع قنواتنا
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
          وتذكّر: يمكنك أيضاً التسجيل مباشرة في أقسام المنصة أو التواصل معنا عبر
          واتساب الأعمال.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {CHANNELS.map((c) => (
            <a
              key={c.id}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-ghost !py-2.5 text-xs ${c.color}`}
            >
              <ChannelIcon id={c.id} className="h-4 w-4" />
              {c.cta}
            </a>
          ))}
          <Link to="/" className="btn-gold !py-2.5 text-xs">
            تصفح أقسام المنصة
          </Link>
        </div>
        <p className="mt-6 text-[11px] font-semibold text-ink-400">
          للتواصل المباشر مع إدارة المنصة:{" "}
          <a
            href={PLATFORM_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-400 underline underline-offset-4"
          >
            واتساب الأعمال 00967711780999
          </a>
        </p>
      </section>
    </div>
  );
}