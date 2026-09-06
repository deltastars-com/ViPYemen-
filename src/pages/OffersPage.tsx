import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Crown, MessageCircle } from "lucide-react";
import { api } from "../convex/_generated/api";
import { OfferCard, type PublicOffer } from "@/components/OfferCard";
import { EmptyState, Spinner } from "@/components/ui";
import { PLATFORM_WHATSAPP_DISPLAY, PLATFORM_WHATSAPP_LINK } from "@/lib/utils";

export function OffersPage() {
  const offers = useQuery(api.offers.listPublished);

  return (
    <div className="animate-fade-up">
      <section className="relative overflow-hidden border-b border-ink-700/50">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(212,175,55,0.4), transparent 50%)",
          }}
        />
        <div className="container-app relative py-14 text-center sm:py-18">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="chip mx-auto !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
              <Crown className="h-3.5 w-3.5" />
              قسم العروض الترويجية
            </span>
            <h1 className="section-title mt-4 text-cream">
              عروض <span className="gold-text">حصريّة</span> من إدارة المنصة
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-300">
              عروض وخصومات تُنشر من داخل لوحة التحكم وتظهر هنا لحظياً — مع صور
              وفيديوهات قصيرة. للاستفادة من أي عرض تواصل معنا مباشرة عبر واتساب.
            </p>
            <a
              href={PLATFORM_WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="btn-gold mt-6"
            >
              <MessageCircle className="h-4 w-4" />
              تواصل عبر واتساب {PLATFORM_WHATSAPP_DISPLAY}
            </a>
          </motion.div>
        </div>
      </section>

      <section className="container-app py-12">
        {!offers ? (
          <div className="flex justify-center py-16 text-gold-400">
            <Spinner className="h-8 w-8" />
          </div>
        ) : offers.length === 0 ? (
          <EmptyState title="لا توجد عروض حالياً" hint="تترقب عروضاً جديدة قريباً — تابعنا عبر واتساب" />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {(offers as unknown as PublicOffer[]).map((offer) => (
              <OfferCard key={offer._id} offer={offer} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}