import { useQuery } from "convex/react";
import { LogoMark } from "@/components/Logo";
import { motion } from "framer-motion";
import { Crown, MessageCircle, PlayCircle, BadgePercent, ShieldCheck } from "lucide-react";
import { api } from "../convex/_generated/api";
import { OfferCard, type PublicOffer } from "@/components/OfferCard";
import { Badge, EmptyState, Spinner } from "@/components/ui";
import { PLATFORM_WHATSAPP_DISPLAY, PLATFORM_WHATSAPP_LINK, whatsappLink } from "@/lib/utils";

export function OffersPage() {
  const offers = useQuery(api.offers.listPublished);
  const rows = (offers ?? []) as unknown as PublicOffer[];
  const featured = rows.find((o) => o.isFeatured) ?? rows[0];
  const rest = rows.filter((o) => o._id !== featured?._id);

  return (
    <div className="animate-fade-up">
      {/* Hall header */}
      <section className="relative overflow-hidden border-b border-ink-700/50">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(212,175,55,0.4), transparent 45%), radial-gradient(circle at 85% 80%, rgba(212,175,55,0.15), transparent 40%)",
          }}
        />
        <div className="container-app relative py-14 text-center sm:py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
              <Crown className="h-3.5 w-3.5" />
              صالة العروض الترويجية
            </span>
            <h1 className="section-title mt-4 text-cream">
              صالة <span className="gold-text">العروض</span> الحصرية
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-300">
              عروض وخدمات وخصومات تُنشر من إدارة المنصة لحظياً — بالصور والفيديوهات.
              كل عرض مُدقَّق ومضمون، واطلبه مباشرة عبر واتساب.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-ink-300">
              <span className="chip !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
                <BadgePercent className="h-3.5 w-3.5" /> خصومات حقيقية
              </span>
              <span className="chip !border-emerald-500/40 !bg-emerald-500/10 !text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" /> عروض مدققة من الإدارة
              </span>
              <span className="chip !border-sky-500/40 !bg-sky-500/10 !text-sky-300">
                <LogoMark className="h-4 w-4" /> تُحدث لحظياً
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container-app py-12">
        {!offers ? (
          <div className="flex justify-center py-16 text-gold-400">
            <Spinner className="h-8 w-8" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد عروض حالياً" hint="تترقب عروضاً جديدة قريباً — تابعنا عبر واتساب" />
        ) : (
          <>
            {/* Featured spotlight */}
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="relative mb-10 overflow-hidden rounded-3xl border border-gold-500/40 shadow-[0_20px_80px_-30px_rgba(212,175,55,0.45)]"
              >
                <div className="absolute inset-0 bg-gradient-to-l from-ink-950 via-ink-950/85 to-ink-900/40" />
                {featured.imageUrl && (
                  <img
                    src={featured.imageUrl}
                    alt={featured.title}
                    className="absolute inset-0 h-full w-full object-cover opacity-45"
                  />
                )}
                <div className="relative grid gap-6 p-7 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-gold-500/50 bg-gold-500/20 text-gold-200">
                        <Crown className="h-3.5 w-3.5" />
                        العرض المميز
                      </Badge>
                      {featured.discountPercent ? (
                        <Badge className="border-rose-500/50 bg-rose-500/15 text-rose-300">
                          <BadgePercent className="h-3.5 w-3.5" />
                          خصم {featured.discountPercent}%
                        </Badge>
                      ) : null}
                    </div>
                    <h2 className="mt-4 text-2xl font-black leading-snug text-cream sm:text-3xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-200">
                      {featured.description}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      {featured.offerPrice !== undefined && (
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-3xl font-black text-gold-300">
                            {featured.offerPrice.toLocaleString("en-US")}
                            <span className="mr-1 text-sm font-bold">ريال</span>
                          </span>
                          {featured.originalPrice !== undefined && (
                            <span className="text-sm font-bold text-ink-400 line-through">
                              {featured.originalPrice.toLocaleString("en-US")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={whatsappLink(
                          "00967711780999",
                          `مرحباً، أريد الاستفادة من العرض المميز "${featured.title}" في منصة ViP Yemen`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-gold"
                      >
                        <MessageCircle className="h-4 w-4" />
                        اطلب هذا العرض
                      </a>
                      {featured.videoUrl && (
                        <a
                          href={featured.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost"
                        >
                          <PlayCircle className="h-4 w-4 text-gold-400" />
                          شاهد الفيديو
                        </a>
                      )}
                    </div>
                  </div>
                  {featured.imageUrl && (
                    <div className="hidden lg:block">
                      <img
                        src={featured.imageUrl}
                        alt={featured.title}
                        className="aspect-video w-full rounded-2xl border border-gold-500/30 object-cover shadow-2xl"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Offers grid */}
            {rest.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {rest.map((offer, i) => (
                  <motion.div
                    key={offer._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.45 }}
                  >
                    <OfferCard offer={offer} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Hall CTA */}
            <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-gold-500/25 bg-gold-500/5 p-8 text-center">
              <p className="max-w-lg text-sm leading-relaxed text-ink-200">
                لديك عرض خاص أو ترغب بالترويج لمنشأتك في صالة العروض؟ تواصل مع
                إدارة المنصة — ننشر عروضك بالصور والفيديوهات على واجهة المنصة
                وقنوات التواصل.
              </p>
              <a href={PLATFORM_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-gold">
                <MessageCircle className="h-4 w-4" />
                واتساب المنصة: {PLATFORM_WHATSAPP_DISPLAY}
              </a>
            </div>
          </>
        )}
      </section>
    </div>
  );
}