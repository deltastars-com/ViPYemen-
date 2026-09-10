import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  Code2,
  Crown,
  Home,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
  Eye,
  Lock,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { CATEGORIES } from "@/lib/categories";
import { SubmissionCard, type PublicSubmission } from "@/components/SubmissionCard";
import { OfferCard } from "@/components/OfferCard";
import { ChannelsSection } from "@/components/ChannelsSection";
import { HeroIllustration, VerifiedSeal } from "@/components/Illustrations";
import { Spinner } from "@/components/ui";
import { SectionHeading } from "@/components/SectionHeading";
import { useLang } from "@/lib/i18n";
import { PLATFORM_WHATSAPP_DISPLAY, PLATFORM_WHATSAPP_LINK } from "@/lib/utils";

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function Landing() {
  const { t } = useLang();
  const seed = useMutation(api.seed.ensureSeedData);
  useEffect(() => {
    seed().catch(() => {});
  }, [seed]);
  const stats = useQuery(api.submissions.getPublicStats);
  const ads = useQuery(api.ads.listActive);
  const offers = useQuery(api.offers.listPublished);
  const jobs = useQuery(api.submissions.listPublished, { category: "jobs", limit: 3 });
  const realEstate = useQuery(api.submissions.listPublished, { category: "real_estate", limit: 3 });
  const emarket = useQuery(api.submissions.listPublished, { category: "emarket", limit: 3 });

  const latest: PublicSubmission[] = [
    ...((jobs ?? []) as unknown as PublicSubmission[]),
    ...((realEstate ?? []) as unknown as PublicSubmission[]),
    ...((emarket ?? []) as unknown as PublicSubmission[]),
  ]
    .sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt))
    .slice(0, 6);

  return (
    <div className="animate-fade-up">
      {/* ============ Hero ============ */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 50% -5%, rgba(212,175,55,0.15), transparent), radial-gradient(ellipse 45% 40% at 88% 40%, rgba(84,93,186,0.55), transparent), radial-gradient(ellipse 45% 40% at 10% 70%, rgba(212,175,55,0.06), transparent)",
          }}
        />
        <div className="container-app relative pb-20 pt-16 text-center sm:pt-24">
          <motion.div initial="hidden" animate="show" variants={fade}>
            <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
              <Crown className="h-3.5 w-3.5" />
              {t("heroBadge")}
            </span>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.25] text-cream sm:text-5xl lg:text-6xl">
              {t("heroTitle1")}
              <span className="gold-text"> {t("heroTitle2")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
              {t("heroSub")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/jobs" className="btn-gold">
                <Briefcase className="h-4 w-4" />
                {t("ctaJobs")}
              </Link>
              <Link to="/emarket" className="btn-ghost">
                <ShoppingBag className="h-4 w-4" />
                {t("ctaMarket")}
              </Link>
            </div>
            <div className="mx-auto mt-12 flex max-w-4xl items-end justify-center gap-4">
              <HeroIllustration
                className="hidden h-40 w-auto shrink-0 opacity-95 sm:block lg:h-48"
                variant="survey"
              />
              <HeroIllustration className="h-44 w-auto lg:h-56" variant="store" />
              <HeroIllustration
                className="hidden h-40 w-auto shrink-0 opacity-95 sm:block lg:h-48"
                variant="search"
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-black text-gold-300/90">
              <VerifiedSeal className="h-5 w-5" />
              {t("verified")}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { icon: Users, label: "طلب مُسجّل", value: stats ? Object.values(stats.counts).reduce((a, b) => a + b, 0) : "—" },
              { icon: ShieldCheck, label: "طلبات مراجعة وتدقيق", value: "100%" },
              { icon: Home, label: "عقار مُسوَّق", value: stats?.counts.real_estate ?? "—" },
              { icon: BadgeCheck, label: "تواصل موثوق", value: "واتساب" },
            ].map((s) => (
              <div key={s.label} className="card-surface p-4">
                <s.icon className="mx-auto mb-2 h-5 w-5 text-gold-400" />
                <p className="text-lg font-black text-cream">{s.value}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-ink-300">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============ Services ============ */}
      <section className="container-app py-16">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={fade}>
          <SectionHeading icon={LayoutGrid} title={t("sectionsTitle")} subtitle={t("sectionsSub")} center />
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <Link
                to={`/${c.key === "real_estate" ? "real-estate" : c.key === "emarket" ? "emarket" : c.key === "software" ? "software" : "jobs"}`}
                className="card-surface card-surface-hover group block h-full p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300 transition-transform group-hover:scale-110">
                  <c.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold text-cream">{c.label}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-300">{c.hero}</p>
                <p className="mt-4 flex items-center gap-1.5 text-xs font-black text-gold-400">
                  {t("enterSection")}
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============ How it works ============ */}
      <section className="border-y border-ink-700/40 bg-ink-900/40 py-16">
        <div className="container-app">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fade}>
            <SectionHeading icon={ShieldCheck} title={t("howTitle")} subtitle={t("howSub")} center />
          </motion.div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: PenLineIcon, title: t("step1"), text: t("step1Text") },
              { icon: Eye, title: t("step2"), text: t("step2Text") },
              { icon: ShieldCheck, title: t("step3"), text: t("step3Text") },
              { icon: Megaphone, title: t("step4"), text: t("step4Text") },
            ].map((step) => (
              <div key={step.title} className="card-surface p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-300">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-extrabold text-cream">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ Latest listings ============ */}
      <section className="container-app py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <SectionHeading icon={BadgeCheck} title={t("latestTitle")} className="mb-0" />
          <Link to="/jobs" className="flex shrink-0 items-center gap-1.5 pb-2 text-sm font-black text-gold-400 hover:text-gold-300">
            {t("browseAll")}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        {!latest || latest.length === 0 ? (
          <div className="flex justify-center py-10 text-gold-400">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {latest.map((item) => (
              <SubmissionCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* ============ Promotional ads section ============ */}
      {ads && ads.length > 0 && (
        <section className="container-app pb-4">
          <SectionHeading icon={Megaphone} title={t("adsTitle")} subtitle={t("adsSub")} center />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(ads as any[]).slice(0, 6).map((ad) => (
              <div
                key={ad._id}
                className="card-surface card-surface-hover relative overflow-hidden p-5"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-gold-400 via-gold-500/60 to-transparent" />
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/40 bg-gold-500/10 text-gold-300">
                    <Crown className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-cream">{ad.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-300">{ad.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ Featured offers ============ */}
      {offers && offers.length > 0 && (
        <section className="border-y border-ink-700/40 bg-ink-900/40 py-16">
          <div className="container-app">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <SectionHeading icon={Crown} title={t("offersTitle")} highlight={undefined} className="mb-0" />
              <Link to="/offers" className="flex shrink-0 items-center gap-1.5 pb-2 text-sm font-black text-gold-400 hover:text-gold-300">
                {t("allOffers")}
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(offers as any[]).slice(0, 3).map((offer: any) => (
                <OfferCard key={offer._id} offer={offer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ Trust / Why us ============ */}
      <section className="container-app py-16">
        <div className="card-surface grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <SectionHeading icon={ShieldCheck} title={t("whyTitle")} className="mb-6" />
            <ul className="mt-6 space-y-4">
              {[
                "مراجعة إدارية وتدقيق لكل طلب قبل النشر — ضمان الحقوق للجميع",
                "التحقق من أرقام الهواتف وربطها بواتساب المنصة الرسمي",
                "نشر تلقائي على واجهة المنصة وقنوات التواصل الاجتماعي",
                "سرية تامة للبيانات الخاصة — لا تظهر إلا بعد الاعتماد",
                "دعم كامل: توظيف، عقارات، تسويق إلكتروني، برمجيات",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm font-semibold text-ink-200">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <div className="card-surface p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#4ade80]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-cream">تواصل مباشر عبر واتساب</p>
                  <p className="text-xs text-ink-300" dir="ltr">{PLATFORM_WHATSAPP_DISPLAY}</p>
                </div>
              </div>
              <a href={PLATFORM_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-gold mt-4 w-full !py-2.5 text-xs">
                <MessageCircle className="h-4 w-4" />
                راسلنا الآن
              </a>
            </div>
            <div className="card-surface p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-cream">لوحة تحكم مؤمنة</p>
                  <p className="text-xs text-ink-300">لإدارة المنصة فقط — بمراجعة ونشر آمن</p>
                </div>
              </div>
              <Link to="/admin" className="btn-ghost mt-4 w-full !py-2.5 text-xs">
                دخول لوحة التحكم
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Digital channels ============ */}
      <section className="border-y border-ink-700/40 bg-ink-900/30 py-16">
        <div className="container-app">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <SectionHeading icon={Megaphone} title={t("channelsTitle")} subtitle={t("channelsSub")} className="mb-0" />
            <Link
              to="/channels"
              className="flex shrink-0 items-center gap-1.5 pb-2 text-sm font-black text-gold-400 hover:text-gold-300"
            >
              {t("channelsPage")}
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
          <ChannelsSection />
        </div>
      </section>

      {/* ============ Final CTA ============ */}
      <section className="container-app pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-gold-500/30 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900 p-10 text-center sm:p-16">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.18), transparent 55%)",
            }}
          />
          <LogoMark className="mx-auto mb-4 h-10 w-10" />
          <h2 className="mx-auto max-w-2xl text-2xl font-black leading-relaxed text-cream sm:text-3xl">
            {t("finalCta")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-300">
            {t("finalCtaSub")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/jobs" className="btn-gold">
              <Building2 className="h-4 w-4" />
              {t("registerNow")}
            </Link>
            <Link to="/offers" className="btn-ghost">
              <Crown className="h-4 w-4" />
              {t("watchOffers")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PenLineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}